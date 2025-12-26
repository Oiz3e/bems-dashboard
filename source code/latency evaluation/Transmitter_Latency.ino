#include <Wire.h>
#include <BH1750.h>
#include <SPI.h>
#include <mcp2515.h>
#include <DHT.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <math.h>

#define CAN_CS            53
#define DHTPIN            7
#define DHTTYPE           DHT11
#define MQ2_PIN           A1
#define LM393_PIN         2       
#define UV_SENSOR_PIN     A0      
#define UV_FIRE_THRESHOLD 5

BH1750 lightMeter;
DHT dht(DHTPIN, DHTTYPE);
MCP2515 mcp2515(CAN_CS);
Adafruit_MPU6050 mpu;
struct can_frame canMsg;
struct can_frame incomingMsg; // Buffer buat terima request

// Sensor Vars
int mq2_value_adc;
int lm393_status;      
int vibration_status = 0; 
int uv_status = 0;      

const float VIBRATION_THRESHOLD = 1.0; 
float prevAx = 0.0, prevAy = 0.0, prevAz = 0.0;
bool firstReading = true;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pinMode(LM393_PIN, INPUT);
  lightMeter.begin();
  dht.begin();

  if (!mpu.begin()) { Serial.println("❌ MPU Fail"); while (1); }
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  SPI.begin();
  mcp2515.reset();
  mcp2515.setBitrate(CAN_500KBPS, MCP_8MHZ);
  mcp2515.setNormalMode();

  Serial.println("=== Transmitter: WAITING FOR REQUEST MODE ===");
}

void loop() {
  // 1. === SELALU BACA SENSOR (Supaya update terus) ===
  // MPU Logic
  sensors_event_t a, g, temp_mpu;
  mpu.getEvent(&a, &g, &temp_mpu);
  float ax = a.acceleration.x; float ay = a.acceleration.y; float az = a.acceleration.z;
  if (firstReading) { prevAx = ax; prevAy = ay; prevAz = az; firstReading = false; }
  else {
    float vibVal = abs(ax - prevAx) + abs(ay - prevAy) + abs(az - prevAz);
    vibration_status = (vibVal > VIBRATION_THRESHOLD) ? 1 : 0;
    prevAx = ax; prevAy = ay; prevAz = az;
  }

  // Env Sensors
  float lux = lightMeter.readLightLevel();
  float dht_temp = dht.readTemperature();
  float dht_hum = dht.readHumidity();
  if(isnan(dht_temp)) { dht_temp=0; dht_hum=0; }
  mq2_value_adc = analogRead(MQ2_PIN);
  lm393_status = !digitalRead(LM393_PIN);    
  int uv_adc = analogRead(UV_SENSOR_PIN);
  uv_status = (uv_adc > UV_FIRE_THRESHOLD) ? 1 : 0;

  // 2. === CEK APAKAH ADA REQUEST DARI ESP32? ===
  if (mcp2515.readMessage(&incomingMsg) == MCP2515::ERROR_OK) {
    
    // Jika terima ID 0x01 (Request Packet) dari ESP32
    if (incomingMsg.can_id == 0x01) {
      
      // --- LANGSUNG KIRIM BALASAN (PONG) ---
      
      // ID 0x12: LUX
      canMsg.can_id = 0x12; canMsg.can_dlc = 4; 
      memcpy(canMsg.data, &lux, 4);
      mcp2515.sendMessage(&canMsg);
      
      // ID 0x13: TEMP & HUM
      canMsg.can_id = 0x13; canMsg.can_dlc = 8;
      memcpy(canMsg.data, &dht_temp, 4);
      memcpy(canMsg.data + 4, &dht_hum, 4);
      mcp2515.sendMessage(&canMsg);
      
      // ID 0x14: SAFETY SENSORS
      canMsg.can_id = 0x14; canMsg.can_dlc = 5; 
      uint16_t mq2 = (uint16_t)mq2_value_adc;
      memcpy(canMsg.data, &mq2, 2);      
      canMsg.data[2] = (uint8_t)lm393_status;      
      canMsg.data[3] = (uint8_t)vibration_status; 
      canMsg.data[4] = (uint8_t)uv_status;        
      mcp2515.sendMessage(&canMsg);

      // === LOGGING LENGKAP ===
      Serial.println(">>> REQUEST RECEIVED. Data Sent:");
      Serial.print("  - Lux: "); Serial.println(lux);
      Serial.print("  - Temp: "); Serial.print(dht_temp); Serial.print(" C | Hum: "); Serial.print(dht_hum); Serial.println(" %");
      Serial.print("  - Gas ADC: "); Serial.println(mq2_value_adc);
      Serial.print("  - Sound: "); Serial.println(lm393_status == 1 ? "LOUD" : "QUIET");
      Serial.print("  - Vibration: "); Serial.println(vibration_status == 1 ? "MOVING" : "STABLE");
      Serial.print("  - UV Status: "); Serial.println(uv_status == 1 ? "FIRE" : "SAFE");
      Serial.println("-------------------------------------");
    }
  }
}