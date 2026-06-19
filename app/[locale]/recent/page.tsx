import Link from "next/link";
import NonGameHeader from "../../../src/components/NonGameHeader/NonGameHeader";
import { getIntl } from "../../../src/util/server";
import { rem } from "../../../src/util/util";
import RecentGamesPage from "./recent-games-page";

export default async function Page({ params }: PageProps<"/[locale]/recent">) {
  const { locale } = await params;
  const intl = await getIntl(locale);

  return (
    <div className="flexColumn" style={{ gap: "1rem" }}>
      <NonGameHeader leftSidebar="TI ASSISTANT" rightSidebar="RECENT GAMES" />
      <div
        className="flexColumn"
        style={{
          alignSelf: "center",
          alignItems: "stretch",
          gap: rem(16),
          maxWidth: rem(500),
          paddingInline: rem(16),
          width: "100%",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--main-font)",
            fontSize: rem(36),
            fontWeight: "normal",
            lineHeight: 1,
            margin: 0,
            textAlign: "center",
          }}
        >
          {intl.formatMessage({
            id: "3RfPlW",
            defaultMessage: "Recent Games",
            description:
              "Title for a page showing game codes for recently opened games.",
          })}
        </h1>
        <RecentGamesPage />
        <Link href="/" className="outline" style={{ fontSize: rem(24) }}>
          {intl.formatMessage({
            id: "3Cu6UC",
            defaultMessage: "Back",
            description: "Text on a button that returns to the home page.",
          })}
        </Link>
      </div>
    </div>
  );
}
