import Providers from "@/components/Providers";
import App from "@/components/App";
import { AUTH_CONFIGURED } from "@/auth";

export default function Page() {
  return (
    <Providers>
      <App authConfigured={AUTH_CONFIGURED} />
    </Providers>
  );
}
