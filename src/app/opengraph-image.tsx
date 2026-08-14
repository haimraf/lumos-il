import { ImageResponse } from "next/og";

export const alt = "Lumos IL ? ????? ??????? ??????";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#071020",
          color: "#f7e6b4",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#14294c",
            borderRadius: "999px",
            height: "900px",
            opacity: 0.72,
            position: "absolute",
            right: "-290px",
            top: "-390px",
            width: "900px",
          }}
        />
        <div
          style={{
            background: "#946d2a",
            borderRadius: "999px",
            bottom: "-360px",
            height: "700px",
            left: "-220px",
            opacity: 0.38,
            position: "absolute",
            width: "700px",
          }}
        />
        <div
          style={{
            alignItems: "center",
            border: "2px solid #cfa649",
            display: "flex",
            flexDirection: "column",
            height: "74%",
            justifyContent: "center",
            letterSpacing: "0.14em",
            padding: "34px 78px",
            position: "relative",
            width: "76%",
          }}
        >
          <div style={{ color: "#d8b664", fontSize: 28, fontWeight: 600 }}>
            THE HEBREW WIZARDING COMMUNITY
          </div>
          <div
            style={{
              color: "#fff6dc",
              fontFamily: "serif",
              fontSize: 126,
              fontWeight: 700,
              letterSpacing: "0.05em",
              lineHeight: 1,
              marginTop: 30,
            }}
          >
            LUMOS IL
          </div>
          <div
            style={{
              color: "#f7e6b4",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "0.24em",
              marginTop: 36,
            }}
          >
            COMMUNITY ? QUESTS ? MAGIC
          </div>
        </div>
      </div>
    ),
    size,
  );
}
