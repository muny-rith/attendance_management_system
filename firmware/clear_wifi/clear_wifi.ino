#include <WiFi.h>
#include <WiFiManager.h>

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n--- WI-FI MEMORY WIPER ---");

  WiFiManager wm;
  
  Serial.println("Wiping all saved Wi-Fi networks from memory...");
  
  // This physically erases the Wi-Fi credentials from the ESP32's flash memory
  wm.resetSettings();
  
  Serial.println("Wi-Fi memory completely cleared! 100% Wiped.");
  Serial.println("You can now flash attendance_system.ino back to the board to test Moon_Setup.");
}

void loop() {
  // Do nothing
  delay(1000);
}
