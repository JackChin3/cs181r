// Using the DRV8835 motor driver from Pololu.
// - The PWM, analog output pin of each motor sets the speed (0 is stopped, 255 is full speed)
// - The DIR, digital output pin of each motor sets the direction (wire with HIGH as forward)

#define MOTOR_LEFT_ENABLE_PWM D10
#define MOTOR_LEFT_PHASE_DIR D9

#define MOTOR_RIGHT_ENABLE_PWM D8
#define MOTOR_RIGHT_PHASE_DIR D7

void setup()
{
  // Configure (set as output) and initialize (set as stopped) motor pins

  pinMode(MOTOR_LEFT_ENABLE_PWM, OUTPUT);
  analogWrite(MOTOR_LEFT_ENABLE_PWM, 0);

  pinMode(MOTOR_LEFT_PHASE_DIR, OUTPUT);
  digitalWrite(MOTOR_LEFT_PHASE_DIR, LOW);

  pinMode(MOTOR_RIGHT_ENABLE_PWM, OUTPUT);
  analogWrite(MOTOR_RIGHT_ENABLE_PWM, 0);

  pinMode(MOTOR_RIGHT_PHASE_DIR, OUTPUT);
  digitalWrite(MOTOR_RIGHT_PHASE_DIR, LOW);
}

void loop()
{
  // Repeated behavior:
  // - forward at half speed for 2 seconds
  // - stop for half a second
  // - reverse at half speed for 2 seconds
  // - stop for half a second

  int abs_speed_percent = 50;

  // Forward
  setMotorSpeed(abs_speed_percent);
  delay(2000);

  // Brake
  setMotorSpeed(0);
  delay(500);

  // Reverse
  setMotorSpeed(-abs_speed_percent);
  delay(2000);

  // Brake
  setMotorSpeed(0);
  delay(500);
}

void setMotorSpeed(int raw_speed)
{

  if (raw_speed >= 0)
  {
    digitalWrite(MOTOR_LEFT_PHASE_DIR, HIGH);
    digitalWrite(MOTOR_RIGHT_PHASE_DIR, HIGH);
  }
  else
  {
    digitalWrite(MOTOR_LEFT_PHASE_DIR, LOW);
    digitalWrite(MOTOR_RIGHT_PHASE_DIR, LOW);
  }

  int speed = constrain(abs(raw_speed), 0, 100);
  int PWM = map(speed, 0, 100, 0, 255);

  analogWrite(MOTOR_LEFT_ENABLE_PWM, PWM);
  analogWrite(MOTOR_RIGHT_ENABLE_PWM, PWM);
}
