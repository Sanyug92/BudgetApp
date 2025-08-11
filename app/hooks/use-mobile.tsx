import { useState, useEffect } from "react";
import { Dimensions } from "react-native";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const updateSize = () => {
      const { width } = Dimensions.get("window");
      setIsMobile(width < MOBILE_BREAKPOINT);
    };

    updateSize(); // set initial value

    const subscription = Dimensions.addEventListener("change", updateSize);

    return () => {
      // RN >= 0.65 uses remove() method
      subscription?.remove?.();
    };
  }, []);

  return isMobile;
}
