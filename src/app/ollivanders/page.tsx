"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Coins,
  Flame,
  History,
  Quote,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Star,
  Wand2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useOwlMail } from "@/components/OwlMail";
import { useAuth } from "@/context/AuthContext";
import CanonBadge from "@/components/CanonBadge";
import { logActivityEvent } from "@/lib/activityEvents";
import { isUnsortedHouse } from "@/lib/houses";
import { type CanonSource } from "@/lib/wizardingCanon";

const WAND_COST = 15;
const OLLIVANDER = "אוליבנדר";
const GREGOROVITCH = "גרגורוביץ'";

const WOODS_LORE: Record<string, string> = {
  "אלון (Oak)": "עץ יציב, ישיר ובטוח בעצמו. הוא נמשך לבעלי עמוד שדרה שקט ולכוח רצון שלא צריך להכריז על עצמו בקול.",
  "הולי (Holly)": "עץ של הגנה והכרעה. הוא בוחר במי שמוכן לעמוד מול כאוס בלי לאבד את הלב שלו בדרך.",
  "עץ-זקן (Elder)": "העץ הנדיר והמסוכן מכולם. הוא אינו מתמסר בקלות, ורק קוסמים עם נוכחות חזקה במיוחד מצליחים להחזיק בו לאורך זמן.",
  "ערבה (Willow)": "עץ רגיש ואינטואיטיבי, שלעתים קרובות בוחר במי שנראה רגוע מבחוץ אך נושא עוצמה לא גמורה מתחת לפני השטח.",
  "גפן (Vine)": "שרביט של שאפתנים יצירתיים, כאלה שמפתיעים את הסביבה בדיוק ברגע שבו כולם בטוחים שכבר פענחו אותם.",
  "מהגוני (Mahogany)": "עץ מהיר, חד ומדויק במיוחד. ידוע בנטייה שלו להעדיף קסם נקי, אלגנטי וממוקד.",
  "ארז (Cedar)": "עץ נאמן ובעל אחיזה חזקה במציאות. הוא נמשך לבעלי תפיסה חדה, ביטחון פנימי ושיקול דעת יציב.",
  "עוזרר (Hawthorn)": "עץ של מעבר והשתנות, שנקשר לעתים קרובות לבעלי נפש מורכבת, חזקה וסותרת בעת ובעונה אחת.",
  "אפר (Ash)": "עץ שמעדיף יד יציבה והתמסרות ארוכה. הוא פחות אוהב גחמות ויותר מאמין בהתפתחות שקטה ומדויקת.",
  "אגוז מלך (Walnut)": "עץ חכם, אסטרטגי ובעל קסם חד. הוא נמשך למי שיודע לקרוא את החדר עוד לפני שמישהו אחר שם לב למה שקורה בו.",
  "דובדבן (Cherry)": "עץ נדיר של נוכחות מיידית. יש בו עידון, יוקרה ועוצמה שמתגלים מהר יותר מכפי שנדמה.",
  "הורנבין (Hornbeam)": "עץ צפוף ועקשן שמתחבר לקסם ממוקד וחד. הוא אוהב משמעת, דיוק ותגובה מהירה.",
  "רואן (Rowan)": "עץ מגן מטבעו, קשור לעמידות פנימית ולנטייה לעצור השפעות שליליות עוד לפני שהתקרבו מדי.",
  "לוז (Hazel)": "עץ בעל רגישות גבוהה לקסם סביבתי. הוא נמשך לבעלי תחושה חדה לפרטים ולשינויים דקים במרחב.",
  "טקסוס (Yew)": "עץ קיצוני, עמוק ובעל כוח משיכה אפלולי. הוא אינו בהכרח אפל, אבל תמיד מבקש בעלים עם עצבים חזקים.",
  "רוזווד (Rosewood)": "עץ אלגנטי ורך למראה, אך כזה שמחזיק שליטה מרשימה וקסם חברתי מדויק.",
  "בוקיצה (Elm)": "עץ אצילי, מבריק ומודע לעצמו. הוא אוהב הופעה מסודרת, כוח מרוכז ותחושת שליטה ברורה.",
};

const CORES_LORE: Record<string, string> = {
  "נוצת עוף חול": "הליבה הנדירה ביותר. שרביטים כאלה שומרים על עצמאות, עוצמה פנימית ויכולת נדירה להתלקח דווקא ברגעי אמת.",
  "נימת לב של דרקון": "ליבה עוצמתית ומהירה ללמידה, שנוטה לבחור בקוסמים שיש בהם אש, דחף ונטייה לפעול בלי לפחד מהעוצמה שלהם.",
  "שערת חד-קרן": "ליבה יציבה, נאמנה וטהורה. היא מפיקה קסם מאוזן ועקבי, ומעניקה תחושה של משמעת ושליטה נקייה.",
  "שערת זנב של ת'סטרל": "ליבה מסתורית ונדירה, שמתקשרת לעומק רגשי, כוח אפל-אפור ויכולת לעבוד עם רבדים שאחרים מחמיצים.",
  "שערת וילה": "ליבה נדירה של כריזמה, חן וקסם שנע במהירות. היא אוהבת יד בטוחה מאוד ולא סולחת על היסוס.",
};

type CanonicalWand = {
  maker: string;
  wood: string;
  core: string;
  length: string;
  keeper: string;
  note: string;
  source: CanonSource;
};

type WandData = {
  fullText: string;
  wood: string;
  core: string;
  maker: string;
  isGregorovitch: boolean;
  length: string;
  keeper?: string;
  note?: string;
  source?: CanonSource;
};

type WeightedChoice<T> = {
  value: T;
  weight: number;
};

const CANONICAL_WANDS: CanonicalWand[] = [
  {
    maker: OLLIVANDER,
    wood: "הולי (Holly)",
    core: "נוצת עוף חול",
    length: "11 אינץ'",
    keeper: "הארי פוטר",
    note: "חתימה נדירה של הגנה, גורל ונאמנות לקסם אינטואיטיבי.",
    source: "both",
  },
  {
    maker: OLLIVANDER,
    wood: "גפן (Vine)",
    core: "נימת לב של דרקון",
    length: "10¾ אינץ'",
    keeper: "הרמיוני גריינג'ר",
    note: "חדות מחשבה, דיוק והרבה יוזמה תחת לחץ.",
    source: "both",
  },
  {
    maker: OLLIVANDER,
    wood: "ערבה (Willow)",
    core: "שערת חד-קרן",
    length: "14 אינץ'",
    keeper: "רון ויזלי",
    note: "חום, נאמנות ויכולת לגדול בדיוק במקום שבו לא ציפו.",
    source: "both",
  },
  {
    maker: OLLIVANDER,
    wood: "עוזרר (Hawthorn)",
    core: "שערת חד-קרן",
    length: "10 אינץ'",
    keeper: "דראקו מאלפוי",
    note: "שרביט של מורכבות, מתח פנימי ויכולת לשנות כיוון.",
    source: "both",
  },
  {
    maker: OLLIVANDER,
    wood: "אגוז מלך (Walnut)",
    core: "נימת לב של דרקון",
    length: "12¾ אינץ'",
    keeper: "בלטריקס לסטריינג'",
    note: "עוצמה בוטה, מסירות קיצונית ואש פנימית לא יציבה.",
    source: "both",
  },
  {
    maker: OLLIVANDER,
    wood: "אפר (Ash)",
    core: "שערת חד-קרן",
    length: "12¼ אינץ'",
    keeper: "סדריק דיגורי",
    note: "איזון טבעי, אמינות ותחושת כבוד שנשמרת גם בתחרות.",
    source: "both",
  },
  {
    maker: OLLIVANDER,
    wood: "דובדבן (Cherry)",
    core: "שערת חד-קרן",
    length: "13 אינץ'",
    keeper: "נוויל לונגבוטום",
    note: "צמיחה שקטה שהופכת לעמוד שדרה מפתיע ברגע האמת.",
    source: "both",
  },
  {
    maker: OLLIVANDER,
    wood: "בוקיצה (Elm)",
    core: "נימת לב של דרקון",
    length: "18 אינץ'",
    keeper: "לוציוס מאלפוי",
    note: "אלגנטיות, שליטה ונוכחות שאוהבת להיכנס ראשונה לחדר.",
    source: "both",
  },
  {
    maker: GREGOROVITCH,
    wood: "הורנבין (Hornbeam)",
    core: "נימת לב של דרקון",
    length: "10¼ אינץ'",
    keeper: "ויקטור קרום",
    note: "שרביט צפוף, חד ומדויק שמעדיף פעולה יעילה על פני הצגה.",
    source: "both",
  },
];

const MAKER_POOLS: Record<
  string,
  {
    woods: WeightedChoice<string>[];
    cores: WeightedChoice<string>[];
    length: { min: number; max: number };
  }
> = {
  [OLLIVANDER]: {
    woods: [
      { value: "הולי (Holly)", weight: 8 },
      { value: "אלון (Oak)", weight: 8 },
      { value: "גפן (Vine)", weight: 7 },
      { value: "ארז (Cedar)", weight: 7 },
      { value: "מהגוני (Mahogany)", weight: 6 },
      { value: "ערבה (Willow)", weight: 6 },
      { value: "עוזרר (Hawthorn)", weight: 5 },
      { value: "אפר (Ash)", weight: 5 },
      { value: "רואן (Rowan)", weight: 4 },
      { value: "לוז (Hazel)", weight: 4 },
      { value: "אגוז מלך (Walnut)", weight: 4 },
      { value: "דובדבן (Cherry)", weight: 3 },
      { value: "בוקיצה (Elm)", weight: 2 },
    ],
    cores: [
      { value: "שערת חד-קרן", weight: 11 },
      { value: "נימת לב של דרקון", weight: 9 },
      { value: "נוצת עוף חול", weight: 3 },
      { value: "שערת וילה", weight: 1 },
    ],
    length: { min: 9.25, max: 14.5 },
  },
  [GREGOROVITCH]: {
    woods: [
      { value: "הורנבין (Hornbeam)", weight: 8 },
      { value: "רוזווד (Rosewood)", weight: 7 },
      { value: "אגוז מלך (Walnut)", weight: 6 },
      { value: "דובדבן (Cherry)", weight: 6 },
      { value: "אפר (Ash)", weight: 6 },
      { value: "טקסוס (Yew)", weight: 5 },
      { value: "בוקיצה (Elm)", weight: 4 },
      { value: "עץ-זקן (Elder)", weight: 2 },
    ],
    cores: [
      { value: "נימת לב של דרקון", weight: 11 },
      { value: "שערת חד-קרן", weight: 5 },
      { value: "שערת וילה", weight: 3 },
      { value: "שערת זנב של ת'סטרל", weight: 2 },
    ],
    length: { min: 9.75, max: 15.25 },
  },
};

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function formatLength(value: number) {
  const rounded = Math.round(value * 4) / 4;
  const whole = Math.floor(rounded);
  const fraction = rounded - whole;
  const suffix =
    fraction === 0.25 ? "¼" : fraction === 0.5 ? "½" : fraction === 0.75 ? "¾" : "";

  return `${whole}${suffix} אינץ'`;
}

function buildWandData(base: {
  maker: string;
  wood: string;
  core: string;
  length: string;
  keeper?: string;
  note?: string;
}): WandData {
  return {
    ...base,
    fullText: `${base.wood}, ${base.core}, ${base.length}`,
    isGregorovitch: normalizeValue(base.maker).includes(normalizeValue(GREGOROVITCH)),
  };
}

function pickWeighted<T>(choices: WeightedChoice<T>[]) {
  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const choice of choices) {
    roll -= choice.weight;
    if (roll <= 0) {
      return choice.value;
    }
  }

  return choices[choices.length - 1].value;
}

function findCanonicalWand(candidate: {
  maker: string;
  wood: string;
  core: string;
  length: string;
}) {
  return CANONICAL_WANDS.find(
    (wand) =>
      normalizeValue(wand.maker) === normalizeValue(candidate.maker) &&
      normalizeValue(wand.wood) === normalizeValue(candidate.wood) &&
      normalizeValue(wand.core) === normalizeValue(candidate.core) &&
      normalizeValue(wand.length) === normalizeValue(candidate.length),
  );
}

function generateWandData(): WandData {
  const maker = Math.random() < 0.14 ? GREGOROVITCH : OLLIVANDER;
  const canonicalCandidates = CANONICAL_WANDS.filter((wand) => wand.maker === maker);
  const canonicalChance = maker === GREGOROVITCH ? 0.18 : 0.22;

  if (canonicalCandidates.length > 0 && Math.random() < canonicalChance) {
    const canonical =
      canonicalCandidates[Math.floor(Math.random() * canonicalCandidates.length)];

    return buildWandData(canonical);
  }

  const pool = MAKER_POOLS[maker];
  const wood = pickWeighted(pool.woods);
  let core = pickWeighted(pool.cores);

  if (wood === "עץ-זקן (Elder)" && Math.random() < 0.72) {
    core = "שערת זנב של ת'סטרל";
  }

  const woodBonus =
    wood === "אגוז מלך (Walnut)" || wood === "טקסוס (Yew)"
      ? 0.45
      : wood === "דובדבן (Cherry)" || wood === "רוזווד (Rosewood)"
      ? -0.2
      : 0;

  return buildWandData({
    maker,
    wood,
    core,
    length: formatLength(
      Math.random() * (pool.length.max - pool.length.min) + pool.length.min + woodBonus,
    ),
  });
}

function parseStoredWand(raw: string | null | undefined): WandData | null {
  if (!raw) return null;

  const [makerPart, restPart] = raw.split(":");
  const maker = restPart ? makerPart.trim() : OLLIVANDER;
  const fullText = restPart ? restPart.trim() : raw.trim();
  const parts = fullText.split(",").map((part) => part.trim());
  const parsed = buildWandData({
    maker,
    wood: parts[0] || "",
    core: parts[1] || "",
    length: parts[2] || "",
  });
  const canonical = findCanonicalWand(parsed);

  return canonical
    ? {
        ...parsed,
        keeper: canonical.keeper,
        note: canonical.note,
      }
    : parsed;
}

export default function OllivandersPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { sendOwl } = useOwlMail();
  const { profile, session, profileError, isLoading: authLoading, refreshProfile } = useAuth();

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [revealedWand, setRevealedWand] = useState<WandData | null>(null);

  const currentWand = useMemo(
    () => revealedWand ?? parseStoredWand(profile?.wand_type),
    [profile?.wand_type, revealedWand],
  );

  const needsSorting = Boolean(profile && isUnsortedHouse(profile.house));
  const needsFirstWand = Boolean(profile && !needsSorting && !currentWand);

  const palette = currentWand?.isGregorovitch
    ? {
        page: "bg-[#090509]",
        aura: "from-red-950/35 via-red-900/18 to-transparent",
        border: "border-red-900/30",
        accentText: "text-red-300",
        accentSoft: "text-red-200/65",
        accentBg: "bg-red-500/10",
        accentRing: "border-red-500/20",
        button:
          "from-red-600 via-red-500 to-orange-500 text-white hover:from-red-500 hover:via-red-400 hover:to-orange-400",
      }
    : {
        page: "bg-[#020617]",
        aura: "from-amber-900/35 via-amber-700/20 to-transparent",
        border: "border-amber-500/20",
        accentText: "text-amber-300",
        accentSoft: "text-amber-200/65",
        accentBg: "bg-amber-500/10",
        accentRing: "border-amber-500/20",
        button:
          "from-amber-500 via-amber-400 to-orange-400 text-amber-950 hover:from-amber-400 hover:via-amber-300 hover:to-orange-300",
      };

  const makerLine = currentWand
    ? currentWand.isGregorovitch
      ? "סדנת השרביטים הנדירה של גרגורוביץ'"
      : "בית השרביטים הרשמי של אוליבנדר"
    : "רוב השרביטים מגיעים מאוליבנדר, ובמקרים נדירים הקסם מושך דווקא אל גרגורוביץ'";

  async function handlePurchase() {
    if (!profile || isPurchasing || needsSorting) return;

    if (profile.galleons < WAND_COST) {
      sendOwl("הכיס ריק", `נדרשים ${WAND_COST} גליאונים כדי לאפשר לשרביט לבחור בך.`, "error");
      return;
    }

    setIsPurchasing(true);
    const newWand = generateWandData();

    const { error } = await supabase.rpc("purchase_wand_secure", {
      p_wand_type: `${newWand.maker}: ${newWand.fullText}`,
      p_cost: WAND_COST,
    });

    if (error) {
      sendOwl("רכישת השרביט נכשלה", error.message, "error");
      setIsPurchasing(false);
      return;
    }

    window.setTimeout(() => {
      setRevealedWand(newWand);
      setIsPurchasing(false);
      sendOwl(
        newWand.keeper
          ? `התגלה הד מן הסאגה: ${newWand.keeper}`
          : newWand.isGregorovitch
          ? "התגלה שרביט נדיר במיוחד"
          : "השרביט בחר בך",
        `חתימת השרביט של ${newWand.maker} נקשרה אל דף הקוסם שלך.`,
        "magic",
      );

      if (session?.user?.id) {
        void logActivityEvent(supabase, {
          actorId: session.user.id,
          eventType: "shop_purchase",
          icon: "🪄",
          title: `השרביט נבחר אצל ${newWand.maker}`,
          subtitle: `${newWand.maker}: ${newWand.fullText}`,
          description: `${WAND_COST} גליאונים`,
          targetType: "wand",
          targetId: `${newWand.maker}:${newWand.fullText}`,
          targetUrl: "/ollivanders",
        });
      }

      void refreshProfile();
    }, 3200);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020617]">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-amber-500" />
        <p className="animate-pulse font-cinzel tracking-widest text-amber-500">טוען את הסדנה...</p>
      </div>
    );
  }

  if (session && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] px-6" dir="rtl">
        <div className="w-full max-w-md space-y-5 rounded-[2rem] border border-amber-500/20 bg-black/30 p-8 text-center shadow-[0_0_40px_rgba(245,158,11,0.08)]">
          <Wand2 className="mx-auto text-amber-500" size={42} />
          <div>
            <h1 className="mb-2 font-cinzel text-2xl font-black text-white">
              הכניסה נפתחה, אבל דף הקוסם עוד מתארגן
            </h1>
            <p className="font-crimson leading-relaxed text-white/55">
              {profileError || "אפשר לנסות לרענן את הדף האישי בלי לנתק את החשבון."}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => refreshProfile()}
              className="rounded-xl bg-amber-500 px-5 py-3 font-cinzel text-sm font-black tracking-widest text-amber-950"
            >
              רענון הדף האישי
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="rounded-xl border border-white/10 px-5 py-3 font-cinzel text-sm font-black tracking-widest text-white/70 transition-all hover:border-white/20 hover:text-white"
            >
              ניתוק בטוח
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className={`relative min-h-screen overflow-hidden pb-20 ${palette.page}`} dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute inset-x-0 top-0 h-[48vh] bg-gradient-to-b ${palette.aura}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02)_0%,transparent_20%,rgba(255,255,255,0.015)_60%,transparent_100%)]" />
        <div className="absolute inset-x-8 top-28 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-x-16 top-40 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute inset-x-10 bottom-24 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-8 md:px-6 md:pt-10">
        <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-cinzel text-sm font-black tracking-[0.18em] text-white/45 transition-all hover:text-white"
          >
            <ChevronRight size={16} />
            חזרה לטירה
          </Link>

          <div className="inline-flex items-center gap-3 self-end rounded-full border border-white/10 bg-black/30 px-5 py-2 backdrop-blur-md md:self-auto">
            <Coins size={16} className={palette.accentText} />
            <span className="font-cinzel text-sm font-black tracking-[0.18em] text-white">
              {profile?.galleons ?? 0} גליאונים
            </span>
          </div>
        </header>

        <section
          className={`relative overflow-hidden rounded-[3.4rem] border ${palette.border} bg-black/25 px-6 py-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:px-10 md:py-12`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_22%,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_18%_70%,rgba(255,255,255,0.04),transparent_28%)]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6 text-right">
              <div className="space-y-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.24em] ${palette.accentRing} ${palette.accentBg} ${palette.accentText}`}
                >
                  <Wand2 size={12} />
                  קבלת שרביט
                </span>
                <h1 className="font-cinzel text-5xl font-black leading-none text-white md:text-7xl">
                  אוליבנדר
                </h1>
                <p className="font-crimson text-xl italic tracking-[0.18em] text-white/45 md:text-2xl">
                  {makerLine}
                </p>
              </div>

              <p className="max-w-2xl text-base leading-8 text-white/72 md:text-lg">
                אחרי שטקס המיון הושלם, זה המקום שבו המסע באמת מתייצב. כאן השרביט בוחר בך,
                נקשר לדף הקוסם שלך, ומתחיל ללוות אותך לאורך כל הדרך בטירה.
              </p>

              {needsSorting ? (
                <div className="rounded-[2rem] border border-rose-400/20 bg-rose-500/8 px-5 py-5 text-right">
                  <p className="font-cinzel text-[11px] font-black uppercase tracking-[0.24em] text-rose-200/70">
                    לפני השרביט
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/72">
                    קודם מצנפת המיון צריכה לקבוע את הבית שלך. רק אחר כך אפשר לתת לשרביט
                    לבחור אותך כמו שצריך.
                  </p>
                </div>
              ) : needsFirstWand ? (
                <div className={`rounded-[2rem] border px-5 py-5 text-right ${palette.accentRing} ${palette.accentBg}`}>
                  <p className={`font-cinzel text-[11px] font-black uppercase tracking-[0.24em] ${palette.accentText}`}>
                    הצעד הבא אחרי המיון
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/72">
                    הבית כבר נקבע. עכשיו נשאר לעבור אצל אוליבנדר, לקבל שרביט ראשון, ולסגור
                    את ההתחלה כמו שצריך.
                  </p>
                </div>
              ) : (
                <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-500/8 px-5 py-5 text-right">
                  <p className="font-cinzel text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200/70">
                    השרביט כבר נקשר
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/72">
                    השרביט כבר בחר בך, ומאותו רגע הוא חלק בלתי נפרד מהזהות הקסומה שלך בטירה.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {needsSorting ? (
                  <Link
                    href="/sorting"
                    className="inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 font-cinzel text-sm font-black uppercase tracking-[0.22em] text-black transition-all hover:bg-amber-100 active:scale-95"
                  >
                    לעבור למיון
                    <Sparkles size={16} />
                  </Link>
                ) : !currentWand ? (
                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                    className={`inline-flex items-center gap-3 rounded-full bg-gradient-to-r px-7 py-4 font-cinzel text-sm font-black uppercase tracking-[0.22em] transition-all active:scale-95 disabled:cursor-wait disabled:opacity-70 ${palette.button}`}
                  >
                    {isPurchasing
                      ? "השרביט בוחן אותך..."
                      : `לאפשר לשרביט לבחור בי · ${WAND_COST} ג׳`}
                    <Sparkles size={16} />
                  </button>
                ) : (
                  <>
                    <Link
                      href="/dashboard?tab=spells"
                      className="inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 font-cinzel text-sm font-black uppercase tracking-[0.22em] text-black transition-all hover:bg-amber-100 active:scale-95"
                    >
                      לחזור לספר הכשפים
                      <CheckCircle2 size={16} />
                    </Link>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-7 py-4 font-cinzel text-sm font-black uppercase tracking-[0.22em] text-white/70 transition-all hover:border-white/20 hover:text-white"
                    >
                      ללוח הראשי
                    </Link>
                  </>
                )}
              </div>

              <div className="grid gap-3 pt-2 sm:grid-cols-3">
                {[
                  {
                    label: "שתי מסורות",
                    value: "רוב השרביטים נמשכים אל אוליבנדר, אבל לפעמים הקסם בוחר דווקא בגרגורוביץ'.",
                    icon: Star,
                    source: "both" as CanonSource,
                  },
                  {
                    label: "הדים מן הסאגה",
                    value: "לעתים נולדות כאן חתימות שמזוהות עם שרביטים מן הספרים והסרטים.",
                    icon: ScrollText,
                    source: "both" as CanonSource,
                  },
                  {
                    label: "ליווי קבוע",
                    value: "הבחירה נחקקת בדף הקוסם שלך וממשיכה איתך הלאה בכל המסע.",
                    icon: ShieldCheck,
                    source: "site" as CanonSource,
                  },
                ].map(({ label, value, icon: Icon, source }) => (
                  <div key={label} className="rounded-[1.7rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="mb-3 flex justify-end">
                      <CanonBadge source={source} />
                    </div>
                    <Icon size={16} className={palette.accentText} />
                    <p className="mt-3 font-cinzel text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/75">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex min-h-[420px] items-center justify-center">
              <div
                className={`absolute inset-x-4 top-8 h-24 rounded-full blur-3xl ${
                  currentWand?.isGregorovitch ? "bg-red-500/20" : "bg-amber-400/20"
                }`}
              />
              <div className="absolute inset-y-10 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/8 to-transparent" />

              <div
                className={`relative w-full max-w-[460px] overflow-hidden rounded-[3rem] border ${palette.border} bg-black/35 px-6 py-8 backdrop-blur-2xl`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%)]" />

                <div className="relative flex flex-col items-center text-center">
                  <div className="relative mb-8 mt-2 flex h-64 w-full items-center justify-center overflow-hidden rounded-[2.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]">
                    <div
                      className={`absolute h-36 w-36 rounded-full blur-3xl ${
                        currentWand?.isGregorovitch ? "bg-red-500/25" : "bg-amber-400/25"
                      } ${isPurchasing ? "animate-pulse" : ""}`}
                    />
                    <div
                      className={`absolute h-[3px] w-[72%] rotate-[132deg] rounded-full ${
                        currentWand?.isGregorovitch
                          ? "bg-gradient-to-r from-red-300/40 via-red-200 to-orange-300/30"
                          : "bg-gradient-to-r from-amber-100/20 via-amber-300 to-orange-200/20"
                      } shadow-[0_0_28px_rgba(255,255,255,0.1)]`}
                    />
                    <div className="absolute right-[22%] top-[40%] h-4 w-4 rounded-full bg-white/25 blur-sm" />
                    <Wand2
                      size={82}
                      className={`relative rotate-45 transition-transform duration-700 ${
                        isPurchasing ? "scale-110" : ""
                      } ${palette.accentText}`}
                    />
                  </div>

                  <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
                    {currentWand ? `נבחר על ידי ${currentWand.maker}` : "מדף השרביטים הראשי"}
                  </p>
                  <h2 className="mt-3 font-crimson text-3xl font-black leading-tight text-white md:text-4xl">
                    {currentWand
                      ? currentWand.fullText
                      : isPurchasing
                      ? "המדף בודק איזו חתימה תתאים לך"
                      : "השרביט שיתאים לך עדיין ממתין על המדף"}
                  </h2>

                  {currentWand?.keeper && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <CanonBadge source={currentWand.source || "both"} />
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-cinzel font-black tracking-[0.2em] ${palette.accentRing} ${palette.accentBg} ${palette.accentText}`}
                      >
                        <Sparkles size={12} />
                        הד מוכר מן הסאגה: {currentWand.keeper}
                      </div>
                    </div>
                  )}

                  <p className={`mt-4 text-sm leading-7 ${palette.accentSoft}`}>
                    {currentWand
                      ? "מאותו רגע, השרביט הזה כבר לא נחשב פריט. הוא הופך להמשך הטבעי של הקסם שלך."
                      : "לא בוחרים כאן לפי מראה בלבד. נותנים לעץ, לליבה ולמסורת להחליט מי באמת ילך איתך."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[3rem] border border-white/10 bg-black/20 px-6 py-7 md:px-8">
            <div className="mb-6 flex items-center gap-3">
              <div className={`rounded-2xl border p-3 ${palette.accentRing} ${palette.accentBg}`}>
                <Quote size={18} className={palette.accentText} />
              </div>
              <div className="text-right">
                <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
                  הערת הסדנה
                </p>
                <h3 className="mt-1 font-cinzel text-2xl font-black text-white">
                  השרביט בוחר את הקוסם
                </h3>
              </div>
            </div>

            <p className="font-crimson text-2xl italic leading-relaxed text-white/78">
              "אחרי המיון, זה הרגע שבו הקסם שלך מפסיק להיות רעיון, ומקבל צורה שאפשר
              להחזיק ביד."
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <CanonBadge source="both" />
              <CanonBadge source="site" />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "בחירה עם משקל אמיתי",
                  text: "המחולל לא זורק עץ וליבה באקראי מוחלט. יש חלוקה בין שתי סדנאות, משקלים שונים, וסיכוי נדיר לחתימות מוכרות מן הסאגה.",
                  icon: ScrollText,
                },
                {
                  title: "קשר שנשמר לטווח ארוך",
                  text: "ברגע שהשרביט בוחר בך, הוא הופך לחלק מדף הקוסם שלך וממשיך ללוות אותך ברחבי הטירה.",
                  icon: History,
                },
              ].map(({ title, text, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-5 py-5 text-right"
                >
                  <Icon size={17} className={palette.accentText} />
                  <h4 className="mt-4 font-cinzel text-lg font-black text-white">{title}</h4>
                  <p className="mt-2 text-sm leading-7 text-white/62">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[3rem] border border-white/10 bg-black/20 px-6 py-7 md:px-8">
            <div className="mb-6 text-right">
              <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
                פרטי השרביט
              </p>
              <h3 className="mt-1 font-cinzel text-2xl font-black text-white">
                {currentWand ? "החתימה הקסומה שלך" : "מה מחכה לך אחרי הבחירה"}
              </h3>
            </div>

            <div className="space-y-4 text-right">
              {[
                { label: "יוצר", value: currentWand?.maker || "אוליבנדר או גרגורוביץ', לפי המשיכה הקסומה" },
                { label: "עץ", value: currentWand?.wood || "ייקבע ברגע הבחירה" },
                { label: "ליבה", value: currentWand?.core || "תיחשף יחד עם השרביט" },
                { label: "אורך", value: currentWand?.length || "ייחשף ברגע שהשרביט יונח ביד" },
                ...(currentWand?.keeper ? [{ label: "הד מוכר", value: currentWand.keeper }] : []),
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 rounded-[1.8rem] border border-white/10 bg-white/[0.03] px-4 py-4"
                >
                  <span className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    {label}
                  </span>
                  <span className="text-sm leading-7 text-white/78">{value}</span>
                </div>
              ))}
            </div>

            {currentWand && (
              <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.03] px-5 py-5 text-right">
                <div className="mb-4 flex items-center gap-3">
                  <Flame size={16} className={palette.accentText} />
                  <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                    קריאת השרביט
                  </p>
                </div>

                <p className="text-sm leading-7 text-white/65">
                  {WOODS_LORE[currentWand.wood] ||
                    "העץ שנבחר לך נוטה לקוסמים עם נוכחות ברורה וכיוון פנימי מדויק."}
                </p>

                <p className="mt-4 text-sm leading-7 text-white/65">
                  {CORES_LORE[currentWand.core] ||
                    "הליבה שנבחרה לשרביט שלך מחזקת את סוג הקסם שכבר מגיע לך בטבעיות."}
                </p>

                {currentWand.note && (
                  <div className={`mt-5 rounded-[1.6rem] border px-4 py-4 ${palette.accentRing} ${palette.accentBg}`}>
                    <div className="mb-3 flex justify-end">
                      <CanonBadge source={currentWand.source || "both"} />
                    </div>
                    <p className={`font-cinzel text-[10px] font-black uppercase tracking-[0.2em] ${palette.accentText}`}>
                      חותם ספרותי
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/72">
                      מזוהה עם <span className="font-cinzel text-white">{currentWand.keeper}</span>.{" "}
                      {currentWand.note}
                    </p>
                  </div>
                )}

                <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="mb-3 flex flex-wrap justify-end gap-2">
                    <CanonBadge source="both" />
                    <CanonBadge source="site" />
                  </div>
                  <p className="text-sm leading-7 text-white/65">
                    כשהופיע כאן הד מוכר מן הסאגה, הוא נשען על דמות ידועה מן הספרים והסרטים.
                    עצם ההתאמה האישית של השרביט לדף הקוסם שלך נשארת טקס משחקי ייחודי של הטירה.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
