#ifndef PROPORTIONAL_CONTROL_H
#define PROPORTIONAL_CONTROL_H

enum Direction
{
  FORWARD,
  REVERSE
};

class MotorController
{
public:
  int forwardLogicLevel_;
  int directionPin_;
  int pwmPin_;
  int maxSpeedMMS_;
  int maxPWMDelta_;
  float controlGain_;
  int minPWM_;
  float controlSignal;

  MotorController(int forwardLogicLevel, int directionPin, int pwmPin, int maxSpeedMMS, int maxPWMDelta, float controlGain, int minPWM)
  {
    forwardLogicLevel_ = forwardLogicLevel;
    directionPin_ = directionPin;
    pwmPin_ = pwmPin;
    maxSpeedMMS_ = maxSpeedMMS;
    maxPWMDelta_ = maxPWMDelta;
    controlGain_ = controlGain;
    minPWM_ = minPWM;
    initialize();
  }

  void initialize()
  {
    pinMode(pwmPin_, OUTPUT);
    analogWrite(pwmPin_, 0);
    pinMode(directionPin_, OUTPUT);
    digitalWrite(directionPin_, LOW);
  }

  void set(Direction direction, int pwm)
  {
    // TODO: require and check for initialization?

    int directionValue = direction == FORWARD ? forwardLogicLevel_ : !forwardLogicLevel_;

    digitalWrite(directionPin_, directionValue);
    analogWrite(pwmPin_, pwm);
  }

  void stop()
  {
    set(FORWARD, 0);
  }

  void setProportional(int motorSpeedPercent, float measuredSpeed)
  {
    // Convert from percent to mm/s
    int motorSpeed = map(motorSpeedPercent, -100, 100, -maxSpeedMMS_, maxSpeedMMS_);

    int error = motorSpeed - measuredSpeed;

    float uDelta = constrain(controlGain_ * error, -maxPWMDelta_, maxPWMDelta_);

    controlSignal = constrain(controlSignal + uDelta, -100, 100);

    Direction direction = controlSignal > 0 ? FORWARD : REVERSE;

    int pwm = 0;

    if (abs(controlSignal) > 5)
    {
      pwm = map(abs(controlSignal), 0, 100, 50, 255);
    }

    set(direction, pwm);
  }
};

#endif // PROPORTIONAL_CONTROL_H
