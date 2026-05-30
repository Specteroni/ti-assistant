import { MapButton } from "../../src/components/QRCode/QRCodeButton";
import QRCodeButtonWrapper, {
  UndoButtonWrapper,
} from "../../src/components/QRCode/QRCodeButtonWrapper";
import GameMenuButton from "../../src/components/GameMenuButton/GameMenuButton";
import SettingsButton from "../../src/components/SettingsModal/SettingsButton";
import ThemeToggleWrapper from "./ThemeToggleWrapper";

export default function NavBarButtons() {
  return (
    <div className="flexRow" style={{ gap: "0.25rem" }}>
      <GameMenuButton />
      <UndoButtonWrapper />
      <MapButton />
      <QRCodeButtonWrapper />
      <ThemeToggleWrapper />
      <SettingsButton />
    </div>
  );
}
