'use client';
import {NormalisableRange} from '@/utils/math/NormalisableRange';
import {KnobBase} from './KnobBase';

type KnobBaseProps = React.ComponentProps<typeof KnobBase>;
type KnobDisabledProps = Pick<KnobBaseProps, 'theme' | 'label' | 'axis'>;

export function KnobDisabled(props: KnobDisabledProps) {
  return (
    <KnobBase
      disabled
      valueDefault={valueDefault}
      valueMin={valueMin}
      valueMax={valueMax}
      stepFn={stepFn}
      stepLargerFn={stepLargerFn}
      valueRawRoundFn={valueRawRoundFn}
      valueRawDisplayFn={valueRawDisplayFn}
      mapTo01={mapTo01}
      mapFrom01={mapFrom01}
      {...props}
    />
  );
}

const valueMin = 20;
const valueMax = 20000;
const valueDefault = 440;
const stepFn = (valueRaw: number): number => {
  if (valueRaw < 100) {
    return 1;
  }

  if (valueRaw < 1000) {
    return 10;
  }

  return 100;
};

const stepLargerFn = (valueRaw: number): number => stepFn(valueRaw) * 10;
const valueRawRoundFn = (x: number): number => x;
const valueRawDisplayFn = (hz: number): string => {
  if (hz < 100) {
    return `${hz.toFixed(1)} Hz`;
  }

  if (hz < 1000) {
    return `${hz.toFixed(0)} Hz`;
  }

  const kHz = hz / 1000;

  if (hz < 10000) {
    return `${kHz.toFixed(2)} kHz`;
  }

  return `${kHz.toFixed(1)} kHz`;
};

const normalisableRange = new NormalisableRange(valueMin, valueMax, 1000);
const mapTo01 = (x: number) => normalisableRange.mapTo01(x);
const mapFrom01 = (x: number) => normalisableRange.mapFrom01(x);
