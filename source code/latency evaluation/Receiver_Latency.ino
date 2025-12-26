#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <mcp2515.h>
#include <time.h>

#define CAN_CS   5
#define CAN_MOSI 23
#define CAN_MISO 19
#define CAN_SCK  18

const char* ssid = "Marlintoed";
const char* password = "Marlino123!!";
const char* mqtt_server = "172.20.10.2";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);
MCP2515 mcp2515(CAN_CS);
struct can_frame canMsg;
struct can_frame requestMsg; 

const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7 * 3600; 
const int daylightOffset_sec = 0;

// === VARIABLE AKUMULASI (Untuk Rata-rata 1 Detik) ===
float accLux = 0, accTemp = 0, accHum = 0, accMQ2 = 0;
int accSound = 0, accVib = 0, accUV = 0;
int sampleCountSec = 0; 
float accCanLatencySec = 0; 

// === STATISTIK LATENCY (1 MENIT) ===
float minCan = 9999, maxCan = 0, sumCan = 0;
float minCpu = 9999, maxCpu = 0, sumCpu = 0;
float minNet = 9999, maxNet = 0, sumNet = 0;
float minE2E = 9999, maxE2E = 0, sumE2E = 0;

int statCountMin = 0;     
int statCountProcess = 0; 

// === TIMING ===
unsigned long lastRequestTime = 0;
unsigned long lastPrintTime = 0;
unsigned long lastStatTime = 0; 

const unsigned long intervalRequest = 100;   // Request tiap 100 ms
const unsigned long intervalPrint = 1000;    // Print rata-rata tiap 1 detik
const unsigned long intervalStat = 60000;    // Laporan Latency tiap 1 menit

unsigned long t_start_request = 0;
bool waitingForReply = false;

// Buffer sementara
float curLux, curTemp, curHum, curMQ2;
int curSound, curVib, curUV;

void setup_wifi() {
  Serial.print("Connecting WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println(" OK!");
}

void reconnect() {
  if (!client.connected()) {
    if (client.connect("ESP32_BEMS")) {
      Serial.println("MQTT Connected");
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);

  SPI.begin(CAN_SCK, CAN_MISO, CAN_MOSI, CAN_CS);
  mcp2515.reset();
  mcp2515.setBitrate(CAN_500KBPS, MCP_8MHZ);
  mcp2515.setNormalMode();

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("=== RECEIVER: RAW LOGGING + E2E MONITOR ===");
  
  requestMsg.can_id = 0x01;
  requestMsg.can_dlc = 1;
  requestMsg.data[0] = 0xFF; 
  
  lastStatTime = millis(); 
  lastPrintTime = millis();
}

String getTimeString() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char buf[30];
    strftime(buf, sizeof(buf), "%d-%m-%Y %H:%M:%S", &timeinfo);
    return String(buf);
  }
  return String("N/A");
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long currentMillis = millis();

  // 1. KIRIM REQUEST (100ms)
  if (currentMillis - lastRequestTime >= intervalRequest) {
    t_start_request = micros();
    mcp2515.sendMessage(&requestMsg);
    waitingForReply = true;
    lastRequestTime = currentMillis;
  }

  // 2. TERIMA BALASAN & LOGGING RAW DATA
  if (mcp2515.readMessage(&canMsg) == MCP2515::ERROR_OK) {
    
    if (canMsg.can_id == 0x12) { // --- ID 0x12: LUX ---
      if (waitingForReply) {
         unsigned long t_end_reply = micros();
         float rtt_us = t_end_reply - t_start_request;
         float can_ms = (rtt_us / 2.0) / 1000.0;
         
         if (can_ms < minCan) minCan = can_ms;
         if (can_ms > maxCan) maxCan = can_ms;
         sumCan += can_ms;
         accCanLatencySec += can_ms;
         waitingForReply = false; 
      }
      memcpy(&curLux, canMsg.data, 4);
      accLux += curLux;
      
      // LOGGING RAW LUX
      Serial.print("-> [RAW 0x12] Lux: "); Serial.println(curLux);
    }
    else if (canMsg.can_id == 0x13) { // --- ID 0x13: TEMP HUM ---
      memcpy(&curTemp, canMsg.data, 4);
      memcpy(&curHum, canMsg.data + 4, 4);
      accTemp += curTemp; accHum += curHum;

      // LOGGING RAW TEMP/HUM
      Serial.print("-> [RAW 0x13] Temp: "); Serial.print(curTemp);
      Serial.print(" | Hum: "); Serial.println(curHum);
    }
    else if (canMsg.can_id == 0x14) { // --- ID 0x14: SAFETY ---
      uint16_t mq; uint8_t s, v, u;
      memcpy(&mq, canMsg.data, 2);
      s = canMsg.data[2]; v = canMsg.data[3]; u = canMsg.data[4];
      curMQ2 = (float)mq; curSound = s; curVib = v; curUV = u;
      
      accMQ2 += curMQ2; accSound += curSound; accVib += curVib; accUV += curUV;
      
      sampleCountSec++; 
      statCountMin++;   

      // LOGGING RAW SAFETY SENSORS
      Serial.print("-> [RAW 0x14] Gas: "); Serial.print(curMQ2);
      Serial.print(" | Snd: "); Serial.print(s);
      Serial.print(" | Vib: "); Serial.print(v);
      Serial.print(" | UV: "); Serial.println(u);
    }
  }

  // 3. PROSES AGGREGASI & E2E CALCULATION (Setiap 1 Detik)
  if (currentMillis - lastPrintTime >= intervalPrint) {
    if (sampleCountSec > 0) {
      unsigned long t_start_calc = micros(); 

      // --- HITUNG RATA-RATA ---
      float avgLux = accLux / sampleCountSec;
      float avgTemp = accTemp / sampleCountSec;
      float avgHum = accHum / sampleCountSec;
      float avgMQ2 = accMQ2 / sampleCountSec;
      float avgVib = (float)accVib / sampleCountSec;
      float avgUV = (float)accUV / sampleCountSec;
      float avgSound = (float)accSound / sampleCountSec;

      // Print Header untuk membedakan dengan RAW
      Serial.println("\n--- 1 SECOND REPORT (AVERAGE) ---");
      Serial.print("AVG Data | N:"); Serial.print(sampleCountSec);
      Serial.print(" | T:"); Serial.print(avgTemp, 1);
      Serial.print(" | Gas:"); Serial.print(avgMQ2, 0);
      Serial.print(" | Vib:"); Serial.print(avgVib, 2);

      // --- KIRIM MQTT ---
      String tStr = getTimeString();
      char plEnv[200], plSafe[200], plMotion[150], plUV[150];
      
      snprintf(plEnv, sizeof(plEnv), "{\"lux\":%.2f,\"tempC\":%.2f,\"hum\":%.2f,\"datetime\":\"%s\"}", avgLux, avgTemp, avgHum, tStr.c_str());
      snprintf(plSafe, sizeof(plSafe), "{\"mq2_adc\":%.0f,\"sound_avg\":%.2f,\"datetime\":\"%s\"}", avgMQ2, avgSound, tStr.c_str());
      snprintf(plMotion, sizeof(plMotion), "{\"vib_avg\":%.2f,\"datetime\":\"%s\"}", avgVib, tStr.c_str());
      snprintf(plUV, sizeof(plUV), "{\"uv_avg\":%.2f,\"datetime\":\"%s\"}", avgUV, tStr.c_str());

      unsigned long t_end_json = micros();
      
      client.publish("bems/environment", plEnv);
      client.publish("bems/gas_sound", plSafe);
      client.publish("bems/motion", plMotion);
      client.publish("bems/uv_status", plUV);
      
      unsigned long t_end_mqtt = micros();

      // --- HITUNG LATENCY DETIK INI ---
      float cpu_ms = (t_end_json - t_start_calc) / 1000.0;
      float net_ms = (t_end_mqtt - t_end_json) / 1000.0;
      float avgCanSec = accCanLatencySec / sampleCountSec;
      
      // E2E Total
      float e2e_ms = avgCanSec + cpu_ms + net_ms;
      
      Serial.print(" || E2E: "); Serial.print(e2e_ms, 3); Serial.println(" ms");
      Serial.println("---------------------------------------"); // Pemisah biar rapi

      // Update Statistik 1 Menit
      if (cpu_ms < minCpu) minCpu = cpu_ms; if (cpu_ms > maxCpu) maxCpu = cpu_ms; sumCpu += cpu_ms;
      if (net_ms < minNet) minNet = net_ms; if (net_ms > maxNet) maxNet = net_ms; sumNet += net_ms;
      if (e2e_ms < minE2E) minE2E = e2e_ms; if (e2e_ms > maxE2E) maxE2E = e2e_ms; sumE2E += e2e_ms;
      
      statCountProcess++;
    }

    // Reset Variable Detik
    accLux = 0; accTemp = 0; accHum = 0; accMQ2 = 0;
    accSound = 0; accVib = 0; accUV = 0;
    accCanLatencySec = 0; 
    sampleCountSec = 0;
    
    lastPrintTime = currentMillis;
  }

  // 4. LAPORAN PERFORMA 1 MENIT
  if (currentMillis - lastStatTime >= intervalStat) {
    if (statCountMin > 0 && statCountProcess > 0) {
      Serial.println("\n\n==============================================================");
      Serial.print("1-MINUTE PERFORMANCE REPORT | Samples: "); Serial.println(statCountMin);
      Serial.println("==============================================================");
      Serial.println("METRIC        | MIN (ms) | MAX (ms) | AVG (ms)");
      Serial.println("--------------------------------------------------------------");
      
      Serial.print("1. CAN Bus    | "); 
      Serial.print(minCan, 3); Serial.print("    | "); 
      Serial.print(maxCan, 3); Serial.print("    | "); 
      Serial.println(sumCan / statCountMin, 3);

      Serial.print("2. ESP32 CPU  | "); 
      Serial.print(minCpu, 3); Serial.print("    | "); 
      Serial.print(maxCpu, 3); Serial.print("    | "); 
      Serial.println(sumCpu / statCountProcess, 3);

      Serial.print("3. MQTT Net   | "); 
      Serial.print(minNet, 3); Serial.print("    | "); 
      Serial.print(maxNet, 3); Serial.print("    | "); 
      Serial.println(sumNet / statCountProcess, 3);

      Serial.println("--------------------------------------------------------------");

      Serial.print("END-TO-END | "); 
      Serial.print(minE2E, 3); Serial.print("    | "); 
      Serial.print(maxE2E, 3); Serial.print("    | "); 
      Serial.println(sumE2E / statCountProcess, 3);
      
      Serial.println("==============================================================\n\n");
    }

    // Reset Semua Statistik
    minCan = 9999; maxCan = 0; sumCan = 0;
    minCpu = 9999; maxCpu = 0; sumCpu = 0;
    minNet = 9999; maxNet = 0; sumNet = 0;
    minE2E = 9999; maxE2E = 0; sumE2E = 0;
    
    statCountMin = 0;
    statCountProcess = 0;
    lastStatTime = currentMillis;
  }
}