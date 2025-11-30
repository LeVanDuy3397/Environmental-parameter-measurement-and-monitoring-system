#include <Arduino.h>
#include "DHT.h"
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

int lcdColumns = 16;
int lcdRows = 2;

LiquidCrystal_I2C lcd(0x27, lcdColumns, lcdRows);

#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

const int measurePin = 34;
const int ledPower = 5;
int samplingTime = 280;
int deltaTime = 40;
int sleepTime = 9680;
float voMeasured = 0;
float calcVoltage = 0;
float dustDensity = 0;
float h = 0;
float t = 0;

// ====== Cấu hình WiFi ======
const char *WIFI_SSID = "Duy";
const char *WIFI_PASSWORD = "0988759274";
String IP_Esp32 = "";

// ====== Cấu hình thiết bị ======
WebServer server(80);

// ====== Helper: trả JSON ======
void sendJson(WebServer &srv, int code, const JsonDocument &doc)
{
  String out;
  serializeJson(doc, out);
  srv.send(code, "application/json", out);
}

// ====== Endpoint: /status ======
void handleis_online()
{
  StaticJsonDocument<128> doc;
  doc["online"] = true;
  sendJson(server, 200, doc);
  Serial.println("Status requested");
}

// ====== Endpoint: /data_from_esp32 (GET) ======
void handledata_from_esp32()
{
  h = dht.readHumidity();
  t = dht.readTemperature();
  float f = dht.readTemperature(true);

  if (isnan(h) || isnan(t) || isnan(f))
  {
    Serial.println(F("Failed to read from DHT sensor!"));
    return;
  }

  float hif = dht.computeHeatIndex(f, h);
  float hic = dht.computeHeatIndex(t, h, false);

  digitalWrite(ledPower, LOW);
  delayMicroseconds(samplingTime);
  voMeasured = analogRead(measurePin);
  delayMicroseconds(deltaTime);
  digitalWrite(ledPower, HIGH);
  delayMicroseconds(sleepTime);
  calcVoltage = voMeasured * (3.3 / 4096.0);
  dustDensity = 170 * calcVoltage - 0.1;

  StaticJsonDocument<128> doc;
  doc["success"] = true;
  doc["humidity"] = String(h);
  doc["temperature"] = String(t);
  doc["dust"] = String(dustDensity);
  doc["is_online"] = true;
  sendJson(server, 200, doc);
  Serial.println("Sensor temperature, humidity, dust data requested");

  lcd.setCursor(0, 0);
  lcd.print(t);
  lcd.print("C");
  lcd.print(" - ");
  lcd.print(h);
  lcd.print("%");

  lcd.setCursor(0, 1);
  lcd.print("Dust: ");
  lcd.print(dustDensity);
}

// ====== Kết nối WiFi ======
void connectWiFi()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
    retry++;
    if (retry > 60)
    {
      Serial.println("\nWiFi connect timeout, restarting...");
      ESP.restart();
    }
  }

  Serial.printf("\nlấy được IP esp32 là %s", WiFi.localIP().toString());
}

void setup()
{
  Serial.begin(115200);
  Serial.println(F("DHT test!!"));
  pinMode(ledPower, OUTPUT);
  dht.begin();
  lcd.init();
  lcd.backlight();

  connectWiFi();

  server.on("/is_online", HTTP_GET, handleis_online);
  server.on("/data_from_esp32", HTTP_GET, handledata_from_esp32);
  server.begin();
  Serial.println("\nESP32 HTTP server started on port 80");
}

void loop()
{
  server.handleClient();
}