import React from "react";

const createMotionComponent = (tag: string) =>
  React.forwardRef<any, any>(({ children, ...props }, ref) =>
    React.createElement(tag as React.ElementType, { ...props, ref }, children)
  );

export const motion = new Proxy(
  {},
  {
    get: (_target, property: string) => createMotionComponent(property),
  }
) as Record<string, React.ComponentType<any>>;

export const AnimatePresence: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

export default motion;
