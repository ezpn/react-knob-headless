import {forwardRef} from 'react';
import {useDrag} from '@use-gesture/react';
import mergeProps from 'merge-props';
import {clamp, clamp01, mapFrom01Linear, mapTo01Linear} from '@dsp-ts/math';

type NativeDivProps = React.ComponentProps<'div'>;

type NativeDivPropsToExtend = Omit<
  NativeDivProps,
  | 'role' // Constant. We don't want to allow overriding this
  | 'aria-valuemin' // Handled by "valueMin"
  | 'aria-valuemax' // Handled by "valueMin"
  | 'aria-valuenow' // Handled by "valueRaw" and "valueRawRoundFn"
  | 'aria-valuetext' // Handled by "valueRawDisplayFn"
  | 'aria-orientation' // Handled by "axis" and "orientation"
  | 'aria-label' // Handled by "KnobHeadlessLabelProps"
  | 'aria-labelledby' // Handled by "KnobHeadlessLabelProps"
  | 'aria-disabled' // Handled by "disabled"
  | 'data-disabled' // Handled by "disabled"
  | 'tabIndex' // Handled by "includeIntoTabOrder"
>;

const axisDefault = 'y';
const includeIntoTabOrderDefault = false;
const disabledDefault = false;
const mapTo01Default = mapTo01Linear;
const mapFrom01Default = mapFrom01Linear;

type KnobHeadlessLabelProps =
  | {
      readonly 'aria-label': string;
    }
  | {
      readonly 'aria-labelledby': string;
    };

type KnobHeadlessProps = NativeDivPropsToExtend &
  KnobHeadlessLabelProps & {
    /**
     * Current raw value.
     * Make sure it's not rounded.
     */
    readonly valueRaw: number;
    /**
     * Minimum value.
     */
    readonly valueMin: number;
    /**
     * Maximum value.
     */
    readonly valueMax: number;
    /**
     * The sensitivity of the drag gesture. Must be a positive float value.
     * Play with this value in different browsers to find the best one for your use case.
     * Recommended value: 0.006 (quite optimal for most scenarios, so far).
     */
    readonly dragSensitivity: number;
    /**
     * The rounding function for the raw value.
     */
    readonly valueRawRoundFn: (valueRaw: number) => number;
    /**
     * The function for mapping raw value to the human-readable text.
     */
    readonly valueRawDisplayFn: (valueRaw: number) => string;
    /**
     * Callback for when the raw value changes.
     * Note, that you shouldn't round the value here, instead, you have to do it inside "valueRawRoundFn".
     */
    readonly onValueRawChange: (newValueRaw: number) => void;
    /**
     * @DEPRECATED Use "axis" instead.
     *
     * Orientation of the knob and its gesture.
     */
    readonly orientation?: 'horizontal' | 'vertical'; // eslint-disable-line react/require-default-props
    /**
     * Gesture axis of the knob.
     * Default: "y".
     */
    readonly axis?: 'x' | 'y' | 'xy';
    /**
     * Whether to include the element into the sequential tab order.
     * If true, the element will be focusable via the keyboard by tabbing.
     * In most audio applications, the knob is usually controlled by the mouse / touch, so it's not needed.
     */
    readonly includeIntoTabOrder?: boolean;
    /**
     * Disabled state, used to prevent component from being manipulated.
     */
    readonly disabled?: boolean;
    /**
     * Used for mapping the value to the normalized knob position (number from 0 to 1).
     * This is the place for making the interpolation, if non-linear one is required.
     * Example: logarithmic scale of frequency input, when knob center position 0.5 corresponds to ~ 1 kHz (instead of 10.1 kHz which is the "linear" center of frequency range).
     */
    readonly mapTo01?: (x: number, min: number, max: number) => number;
    /**
     * Opposite of `mapTo01`.
     */
    readonly mapFrom01?: (x: number, min: number, max: number) => number;
  };

const getTabIndex = (includeIntoTabOrder: boolean, disabled: boolean) =>
  !disabled && includeIntoTabOrder ? 0 : -1;

export const KnobHeadless = forwardRef<HTMLDivElement, KnobHeadlessProps>(
  (
    {
      valueRaw,
      valueMin,
      valueMax,
      dragSensitivity,
      valueRawRoundFn,
      valueRawDisplayFn,
      onValueRawChange,
      orientation,
      axis = axisDefault,
      includeIntoTabOrder = includeIntoTabOrderDefault,
      disabled = disabledDefault,
      mapTo01 = mapTo01Default,
      mapFrom01 = mapFrom01Default,
      ...rest
    },
    forwardedRef,
  ) => {
    const value = valueRawRoundFn(valueRaw);

    /* v8 ignore start */ // eslint-disable-line capitalized-comments
    const bindDrag = useDrag(
      ({delta}) => {
        let diff01 = 0.0;
        diff01 += delta[0] * dragSensitivity;
        diff01 += delta[1] * -dragSensitivity; // Negating the sensitivity for vertical axis (Y), since the direction of it goes top down on computer screens.

        // Conversion of the raw value to 0-1 range
        // makes the sensitivity to be independent from min-max values range,
        // as well as it allows to use non-linear mapping functions.
        const value01 = mapTo01(valueRaw, valueMin, valueMax);
        const newValue01 = clamp01(value01 + diff01);
        const newValueRaw = clamp(
          mapFrom01(newValue01, valueMin, valueMax),
          valueMin,
          valueMax,
        );

        onValueRawChange(newValueRaw);
      },
      {
        pointer: {
          // Disabling default keyboard events provided by @use-gesture:
          // https://use-gesture.netlify.app/docs/options/#pointerkeys
          keys: false,
        },
        axis: getDragAxis(orientation, axis),
        enabled: !disabled,
      },
    );
    /* v8 ignore stop */ // eslint-disable-line capitalized-comments

    return (
      <div
        ref={forwardedRef}
        role='slider'
        aria-valuenow={value}
        aria-valuemin={valueMin}
        aria-valuemax={valueMax}
        aria-orientation={getAriaOrientation(orientation, axis)}
        aria-valuetext={valueRawDisplayFn(valueRaw)}
        tabIndex={getTabIndex(includeIntoTabOrder, disabled)}
        {...mergeProps(
          bindDrag(),
          {
            style: {
              touchAction: 'none', // It's recommended to disable "touch-action" for use-gesture: https://use-gesture.netlify.app/docs/extras/#touch-action
            },
            onPointerDown(event: React.PointerEvent<HTMLElement>) {
              if (!disabled) {
                /* v8 ignore start */ // eslint-disable-line capitalized-comments
                // Touch devices have a delay before focusing so it won't focus if touch immediately moves away from target (sliding). We want thumb to focus regardless.
                // See, for reference, Radix UI Slider does the same: https://github.com/radix-ui/primitives/blob/eca6babd188df465f64f23f3584738b85dba610e/packages/react/slider/src/Slider.tsx#L442-L445
                event.currentTarget.focus();
                /* v8 ignore stop */ // eslint-disable-line capitalized-comments
              }
            },
          },
          disabled && {
            'aria-disabled': true,
            'data-disabled': true,
          },
          rest,
        )}
      />
    );
  },
);

KnobHeadless.displayName = 'KnobHeadless';

KnobHeadless.defaultProps = {
  axis: axisDefault,
  includeIntoTabOrder: includeIntoTabOrderDefault,
  disabled: disabledDefault,
  mapTo01: mapTo01Default,
  mapFrom01: mapFrom01Default,
};

const getDragAxis = (
  orientation: 'horizontal' | 'vertical' | undefined,
  axis: 'x' | 'y' | 'xy',
): 'x' | 'y' | undefined => {
  // The prop is deprecated, but takes precedence for backwards compatibility
  if (orientation) return orientation === 'horizontal' ? 'x' : 'y';

  // "undefined" means no axis lock, i.e. "xy":
  // https://use-gesture.netlify.app/docs/options/#axis
  return axis === 'xy' ? undefined : axis;
};

const getAriaOrientation = (
  orientation: 'horizontal' | 'vertical' | undefined,
  axis: 'x' | 'y' | 'xy',
): React.AriaAttributes['aria-orientation'] => {
  // The prop is deprecated, but takes precedence for backwards compatibility
  if (orientation) return orientation;

  // When using both axes, the orientation is ambiguous:
  // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-orientation#values
  if (axis === 'xy') return undefined;
  return axis === 'x' ? 'horizontal' : 'vertical';
};
