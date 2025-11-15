import { useNavigation } from "@remix-run/react";
import NProgress from "nprogress";
import { useEffect } from "react";
import "nprogress/nprogress.css"; // Import the styles

NProgress.configure({ showSpinner: false });

export default function ProgressBar() {
  const navigation = useNavigation();

  useEffect(() => {
    if (navigation.state === "loading") {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [navigation.state]);

  return null; // No UI needed, just handles the effect
}
