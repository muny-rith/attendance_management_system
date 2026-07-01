#include <Adafruit_Fingerprint.h>

HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n--- FINGERPRINT DATABASE WIPER ---");

  // Using the exact ESP32 pins from your main system
  mySerial.begin(57600, SERIAL_8N1, 16, 17);
  finger.begin(57600);

  if (finger.verifyPassword()) {
    Serial.println("Found fingerprint sensor!");
  } else {
    Serial.println("Did not find fingerprint sensor :(");
    while (1) { delay(1); }
  }

  Serial.println("Wiping all fingerprints from memory...");
  
  if (finger.emptyDatabase() == FINGERPRINT_OK) {
    Serial.println("Database completely cleared! 100% Wiped.");
  } else {
    Serial.println("Error wiping database!");
  }
}

void loop() {
  // Do nothing
  delay(1000);
}
