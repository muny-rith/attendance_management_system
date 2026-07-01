#include <Adafruit_Fingerprint.h>

// Connect to Serial2 on ESP32 (RX=16, TX=17)
HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n--- FINGERPRINT SENSOR FACTORY RESET ---");
  
  mySerial.begin(57600, SERIAL_8N1, 16, 17);
  finger.begin(57600);
  
  if (finger.verifyPassword()) {
    Serial.println("Found fingerprint sensor!");
  } else {
    Serial.println("Did not find fingerprint sensor :( Check wiring!");
    while (1) { delay(1); }
  }

  Serial.println("Wiping all fingerprints from memory...");
  
  // This command completely formats the sensor's flash memory
  uint8_t result = finger.emptyDatabase();
  
  if (result == FINGERPRINT_OK) {
    Serial.println("SUCCESS: Database empty! All fingerprints are deleted.");
    Serial.println("You can now re-upload the main attendance_system.ino code.");
  } else {
    Serial.println("ERROR: Failed to delete database.");
  }
}

void loop() {
  // Do nothing
}
