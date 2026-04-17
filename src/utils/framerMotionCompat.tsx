import React from "react";

const motionProps = [
  'initial', 'animate', 'exit', 'variants', 'transition',
  'whileHover', 'whileTap', 'whileDrag', 'whileFocus', 'whileInView',
  'viewport', 'onAnimationStart', 'onAnimationComplete', 'onUpdate',
  'onDragStart', 'onDragEnd', 'onDrag', 'onDirectionLock',
  'drag', 'dragControls', 'dragListener', 'dragConstraints', 'dragElastic', 'dragMomentum', 'dragPropagation'
];

const createMotionComponent = (tag: string) =>
  React.forwardRef<any, any>(({ children, ...props }, ref) => {
    // Strip motion props to prevent React "unrecognized prop" warnings on DOM elements
    const filteredProps = { ...props };
    motionProps.forEach(prop => {
      if (prop in filteredProps) delete (filteredProps as any)[prop];
    });

    return React.createElement(tag as React.ElementType, { ...filteredProps, ref }, children);
  });

export const motion = new Proxy(
  {},
  {
    get: (_target, property: string) => createMotionComponent(property),
  }
) as Record<string, React.ComponentType<any>>;

export const AnimatePresence: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

export default motion;



