#include <Wire.h>
#include <NimBLEDevice.h>
#include <SparkFun_VL53L5CX_Library.h>

// Bluetooth Globals
#define SERVICE_UUID "19b10000-e8f2-537e-4f6c-d104768a1214"
#define LIDAR_CHARACTERISTIC_UUID "19b10001-e8f2-537e-4f6c-d104768a1214"

static NimBLEServer *pServer;

NimBLECharacteristic *pDepthValueCharacteristic = NULL;

bool deviceConnected = false;

// LiDAR Globals

SparkFun_VL53L5CX LiDARSensor;

int imageWidth = 0;

// Array to hold LiDAR data
int depthValues[64];

class ServerCallbacks : public NimBLEServerCallbacks
{
  void onConnect(NimBLEServer *pServer)
  {
    deviceConnected = true;
  };
  void onDisconnect(NimBLEServer *pServer)
  {
    deviceConnected = false;
    NimBLEDevice::startAdvertising();
  };
};

void setup()
{
  Serial.begin(115200);

  NimBLEDevice::init("LiDAR");

  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());
  NimBLEService *pService = pServer->createService(SERVICE_UUID);
  pDepthValueCharacteristic = pService->createCharacteristic(LIDAR_CHARACTERISTIC_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  pDepthValueCharacteristic->notify(true);
  pService->start();

  NimBLEAdvertising *pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(pService->getUUID());
  pAdvertising->setScanResponse(true);
  pAdvertising->start();

  Wire.begin();

  Serial.println("Initializing sensor board. This can take up to 10s. Please wait.");
  if (LiDARSensor.begin() == false)
  {
    Serial.println(F("Sensor not found - check your wiring. Freezing"));
    while (1)
      ;
  }

  // Enable all 64 pads
  LiDARSensor.setResolution(8 * 8);

  // Calculate printing width
  imageWidth = sqrt(LiDARSensor.getResolution());

  // Set Hz refresh frequency
  LiDARSensor.setRangingFrequency(15);
  LiDARSensor.startRanging();
}

void loop()
{
  // Poll sensor for new data
  if (LiDARSensor.isDataReady() == true)
  {
    VL53L5CX_ResultsData measurementData;
    if (LiDARSensor.getRangingData(&measurementData))
    {

      int arrIndex = 0;
      // The ST library returns the data transposed from zone mapping shown in datasheet
      // Pretty-print data with increasing y, decreasing x to reflect reality
      for (int y = 0; y <= imageWidth * (imageWidth - 1); y += imageWidth)
      {
        for (int x = imageWidth - 1; x >= 0; x--)
        {
          depthValues[arrIndex] = measurementData.distance_mm[x + y];
          arrIndex++;
        }
      }
      Serial.println("Depth Values:");
      for (int i = 0; i < 64; i++)
      {
        Serial.print(depthValues[i]);
        Serial.print("\t");
        if ((i + 1) % 8 == 0)
        {
          Serial.println();
        }
      }
      Serial.println();
      pDepthValueCharacteristic->setValue<int[64]>(depthValues);
      pDepthValueCharacteristic->notify(true);
    }
  }

  // Small delay between polling the sensor data
  delay(5);
}
