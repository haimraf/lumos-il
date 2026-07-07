import { Metadata } from "next";
import { Shield, Hammer, Eye, MessageSquareX, Gavel, ScrollText } from "lucide-react";
import { withCanonical } from "@/lib/seo";
import SecretQuestWord from "@/components/SecretQuestWord"; // <-- ייבוא המילה הסודית

export const metadata: Metadata = withCanonical({
  title: "חוקי הטירה | LUMOS IL - משרד הקסמים",
  description: "הכללים לשמירה על סדר וביטחון בטירת לומוס ישראל. קראו את חוקי הקהילה הרשמיים.",
}, "/rules");

export default function RulesPage() {
  const rules = [
    {
      id: 1,
      title: "כבוד הדדי (Respect)",
      description: "השרביטים למעלה, לא אחד על השני. אנחנו קהילה אחת - התייחסו לכל מכשפה, קוסם ודמות קסומה בכבוד הראוי.",
      icon: <Shield className="w-12 h-12" />,
      tag: "WANDS_UP",
      decree: "DECREE NO. 01"
    },
    {
      id: 2,
      title: "בטיחות (Safety)",
      description: "אל תחשפו פרטים אישיים שלכם או של אחרים. שמרו על בטיחות הקסם שלכם ושל חברות וחברי הקהילה במסדרונות הטירה.",
      icon: <Eye className="w-12 h-12" />,
      tag: "PROTEGO",
      decree: "DECREE NO. 02"
    },
    {
      id: 3,
      title: "איסור אומנויות האופל (No Dark Arts)",
      description: "אפס סובלנות להטרדות, בריונות או התנהגות פוגענית. מי שיבחרו באומנויות האופל יורחקו מהטירה ללא אפשרות חזרה.",
      icon: <Hammer className="w-12 h-12" />,
      tag: "EXPULSO",
      decree: "DECREE NO. 03"
    },
    {
      id: 4,
      title: "ללא ספאם (No Spam)",
      description: "אל תציפו את ערוצי התקשורת בתוכן לא רלוונטי. שמרו על ניקיון הטירה וסדר במסדרונות (האולם הגדול).",
      icon: <MessageSquareX className="w-12 h-12" />,
      tag: "SILENCIO",
      decree: "DECREE NO. 04"
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white py-20 px-6 relative overflow-hidden" dir="rtl">

      {/* רקע Blueprint עדין */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/blueprint.png')]" />
      {/* Ambient glows */}
      <div className="fixed top-0 right-1/3 w-[700px] h-[500px] bg-amber-500/[0.04] rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 w-[600px] h-[400px] bg-amber-900/[0.06] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-20 relative z-10">

        {/* Header - הכרזה רשמית */}
        <div className="text-center space-y-8 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="inline-flex items-center gap-4 bg-amber-500/10 border-2 border-amber-500/40 px-6 py-2 rounded-full text-amber-500 font-cinzel text-xs tracking-[0.4em] uppercase shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <ScrollText size={18} /> הכרזה רשמית של משרד הקסמים
          </div>

          <h1 className="font-cinzel text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]">
            חוקי <span className="text-amber-500">הטירה</span>
          </h1>

          <p className="font-crimson text-2xl md:text-4xl text-amber-100/90 italic font-bold max-w-3xl mx-auto leading-tight">
            &quot;אלו הם הכללים שישמרו על <SecretQuestWord word="הקסם" /> בטוח וטהור עבור כולם.&quot;
          </p>
        </div>

        {/* Rules List */}
        <div className="grid grid-cols-1 gap-12">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="relative group bg-[#050816] border-4 border-amber-500 shadow-[12px_12px_0px_#f59e0b] hover:shadow-[18px_18px_0px_#f59e0b] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-500 rounded-sm"
            >
              <div className="flex flex-col md:flex-row gap-8 p-10 md:p-14">
                {/* Icon Box */}
                <div className="shrink-0 flex items-center justify-center w-24 h-24 bg-amber-500 text-[#020617] shadow-2xl rounded-sm transform group-hover:rotate-6 transition-transform">
                  {rule.icon}
                </div>

                <div className="space-y-6 flex-1">
                  <div className="flex flex-wrap items-center gap-6">
                    <span className="bg-amber-500 text-black px-4 py-1.5 text-xs font-black font-cinzel tracking-widest uppercase">
                      {rule.decree}
                    </span>
                    <span className="text-amber-500 font-cinzel text-sm font-black tracking-[0.4em]">
                      {rule.tag}
                    </span>
                  </div>

                  <h2 className="font-cinzel text-4xl md:text-5xl font-black text-white group-hover:text-amber-400 transition-colors tracking-tight">
                    {rule.title}
                  </h2>

                  <p className="font-crimson text-2xl md:text-3xl leading-snug text-white font-bold">
                    {rule.description}
                  </p>
                </div>
              </div>

              {/* דקורציה של פינה שרופה */}
              <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none"></div>
            </div>
          ))}
        </div>

        {/* Footer Note - חותם המשרד */}
        <div className="relative p-12 md:p-16 border-4 border-dashed border-amber-500/30 rounded-[3rem] text-center space-y-6 bg-amber-500/5 shadow-inner">
          <Gavel size={60} className="text-amber-500/40 mx-auto animate-pulse" />
          <p className="font-crimson text-2xl md:text-3xl text-white italic font-bold">
            &quot;הפרה של חוקים אלו עלולה להוביל לשחרור ינשופי אזהרה או חסימה מוחלטת משערי הטירה.&quot;
          </p>
          <div className="space-y-2">
            <p className="font-cinzel text-xl font-black tracking-[0.5em] text-amber-500 uppercase">
              בפקודת משרד הקסמים
            </p>
            <div className="h-1 w-48 bg-amber-500 mx-auto"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
