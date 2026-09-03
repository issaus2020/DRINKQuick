/**
 * Mengeneingabe für die Flasche: große Tasten, weil sie nachts mit einer
 * Hand und einem Baby auf dem Arm bedient wird.
 */
import { Icon } from './Icon';

interface AmountStepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  max?: number;
  unit?: string;
  presets?: number[];
}

export function AmountStepper({
  value,
  onChange,
  step = 10,
  max = 400,
  unit = 'ml',
  presets = [],
}: AmountStepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(0, next));
  return (
    <div className="stack stack--tight">
      <div className="stepper">
        <button
          type="button"
          className="stepper__button"
          onClick={() => onChange(clamp(value - step))}
          aria-label={`${step} ${unit} weniger`}
        >
          <Icon name="minus" size={22} />
        </button>
        <div className="stepper__value">
          <input
            className="sr-only"
            type="number"
            value={value}
            min={0}
            max={max}
            step={step}
            aria-label={`Menge in ${unit}`}
            onChange={(event) => onChange(clamp(Number(event.target.value)))}
          />
          <span aria-hidden="true">{value}</span>
          <span className="stepper__unit" aria-hidden="true">
            {unit}
          </span>
        </div>
        <button
          type="button"
          className="stepper__button"
          onClick={() => onChange(clamp(value + step))}
          aria-label={`${step} ${unit} mehr`}
        >
          <Icon name="plus" size={22} />
        </button>
      </div>
      {presets.length > 0 && (
        <div className="chips">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="chip"
              aria-pressed={value === preset}
              onClick={() => onChange(preset)}
            >
              {preset} {unit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
