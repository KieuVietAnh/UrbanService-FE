import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import PublicLayout from '../components/public/PublicLayout';
import PublicRecentFeedbacks from '../components/public/PublicRecentFeedbacks';
import usePublicLandingFeed from '../hooks/usePublicLandingFeed';
import PublicMapPreview from '../components/public/PublicMapPreview';
import PublicPageMotion from '../components/public/PublicPageMotion';
import { useAuth } from '../contexts/AuthContext';

const PUBLIC_CREATE_FEEDBACK_URL = '/login?redirect=/tickets/create&intent=create-feedback';
const PUBLIC_MY_FEEDBACKS_URL = '/login?redirect=/tickets&intent=my-feedbacks';

const getQuickAccessItems = ({ createFeedbackUrl, myFeedbacksUrl }) => [
  {
    title: 'Gửi phản ánh mới',
    description: 'Ghi nhận vấn đề bằng hình ảnh, vị trí và mô tả rõ ràng.',
    to: createFeedbackUrl,
    icon: Lucide.MessageSquarePlus,
    iconClassName: 'bg-blue-600 text-white',
  },
  {
    title: 'Theo dõi phản ánh của tôi',
    description: 'Xem trạng thái tiếp nhận, xử lý và kết quả mới nhất.',
    to: myFeedbacksUrl,
    icon: Lucide.ListChecks,
    iconClassName: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300',
  },
  {
    title: 'Xem bản đồ công khai',
    description: 'Khám phá phản ánh theo vị trí và khu vực quan tâm.',
    to: '/community/map',
    icon: Lucide.Map,
    iconClassName: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  },
];

const processSteps = [
  {
    number: '01',
    title: 'Ghi nhận thông tin',
    description: 'Chụp ảnh, mô tả vấn đề và xác định vị trí xảy ra sự cố.',
    icon: Lucide.ScanLine,
  },
  {
    number: '02',
    title: 'Tiếp nhận và phân luồng',
    description: 'Thông tin được kiểm tra và chuyển đến luồng xử lý phù hợp.',
    icon: Lucide.GitBranch,
  },
  {
    number: '03',
    title: 'Theo dõi đến kết quả',
    description: 'Người dân xem tiến độ, kết quả và các cập nhật liên quan.',
    icon: Lucide.CircleCheckBig,
  },
];

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const createFeedbackUrl = isAuthenticated ? '/tickets/create' : PUBLIC_CREATE_FEEDBACK_URL;
  const myFeedbacksUrl = isAuthenticated ? '/tickets' : PUBLIC_MY_FEEDBACKS_URL;
  const quickAccessItems = getQuickAccessItems({ createFeedbackUrl, myFeedbacksUrl });

  const {
    items,
    loading,
    error,
    reload,
  } = usePublicLandingFeed();

  return (
    <PublicLayout>
      <PublicPageMotion>
        <main>
        <section data-public-reveal className="public-hero relative isolate overflow-hidden border-b border-slate-200/80 bg-[#f7faff]" aria-labelledby="landing-hero-title">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="public-hero-backdrop absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(59,130,246,0.16),transparent_29%),radial-gradient(circle_at_88%_14%,rgba(34,211,238,0.15),transparent_28%),radial-gradient(circle_at_70%_88%,rgba(99,102,241,0.11),transparent_32%),linear-gradient(180deg,#eff6ff_0%,#f8fbff_48%,#ffffff_100%)]" />
            <div className="absolute inset-0 opacity-[0.42] [background-image:radial-gradient(circle,rgba(37,99,235,0.16)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)] dark:opacity-[0.18]" />
            <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-500/10" />
            <div className="absolute -right-24 top-12 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
            <svg viewBox="0 0 1440 760" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-blue-600 opacity-[0.10] dark:opacity-[0.10]" fill="none">
              <path d="M-80 620C122 570 190 385 373 399C553 414 610 587 792 544C969 501 1029 316 1218 332C1327 341 1396 384 1510 415" stroke="currentColor" strokeWidth="2" />
              <path d="M-30 686C168 648 268 502 447 517C626 533 699 666 875 626C1046 587 1129 470 1297 485C1386 493 1443 527 1504 556" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 12" />
              <circle cx="373" cy="399" r="7" fill="currentColor" />
              <circle cx="792" cy="544" r="8" fill="currentColor" />
              <circle cx="1218" cy="332" r="7" fill="currentColor" />
            </svg>
            <div className="absolute left-[2.5%] top-[18%] hidden h-[64%] w-px bg-gradient-to-b from-transparent via-blue-300/50 to-transparent 2xl:block dark:via-blue-500/25" />
            <div className="absolute right-[2.5%] top-[16%] hidden h-[68%] w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent 2xl:block dark:via-cyan-500/25" />
            <div className="absolute left-[2.15%] top-[31%] hidden h-3 w-3 rounded-full border border-blue-300/70 bg-white shadow-[0_0_0_9px_rgba(59,130,246,0.07)] 2xl:block dark:border-blue-400/40 dark:bg-slate-950" />
            <div className="absolute right-[2.15%] top-[58%] hidden h-3 w-3 rounded-full border border-cyan-300/70 bg-white shadow-[0_0_0_9px_rgba(34,211,238,0.07)] 2xl:block dark:border-cyan-400/40 dark:bg-slate-950" />
            <div className="absolute left-[8%] top-[27%] hidden h-2.5 w-2.5 rounded-full bg-blue-500/70 shadow-[0_0_0_12px_rgba(59,130,246,0.08)] xl:block dark:bg-blue-400/75" />
            <div className="absolute left-[18%] bottom-[18%] hidden h-2 w-2 rounded-full bg-cyan-400/75 shadow-[0_0_0_10px_rgba(34,211,238,0.07)] xl:block" />
            <div className="absolute right-[19%] top-[22%] hidden h-2.5 w-2.5 rounded-full bg-emerald-400/70 shadow-[0_0_0_11px_rgba(52,211,153,0.07)] xl:block" />
            <div className="absolute right-[10%] bottom-[20%] hidden h-2 w-2 rounded-full bg-indigo-400/70 shadow-[0_0_0_10px_rgba(99,102,241,0.07)] xl:block" />
          </div>

          <div className="mx-auto grid w-full max-w-[1680px] gap-10 px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(600px,1.1fr)] lg:items-center lg:px-8 lg:pb-14 lg:pt-12 2xl:grid-cols-[minmax(560px,0.92fr)_minmax(720px,1.08fr)] 2xl:px-12 2xl:pb-16 2xl:pt-12">
            <header className="max-w-[650px]">
              <span className="public-badge inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700">
                <Lucide.RadioTower size={14} aria-hidden="true" />
                Cổng thông tin phản ánh đô thị
              </span>
              <h1 id="landing-hero-title" className={`public-heading ${isAuthenticated ? 'mt-4' : 'mt-5'} text-[40px] font-semibold leading-[1.1] tracking-[-0.045em] sm:text-[52px] lg:text-[60px]`}>
                Biết điều gì đang diễn ra.
                <span className="mt-1 block text-[#0b56d9] dark:text-blue-400">
                  Gửi đúng nơi, theo dõi đến cùng.
                </span>
              </h1>

              <p className="public-copy mt-5 max-w-[590px] text-base leading-7 sm:text-[17px] sm:leading-8">
                UrbanMind tập trung phản ánh cộng đồng, dữ liệu bản đồ và tiến độ xử lý trong một cổng thông tin rõ ràng — để người dân dễ xem, dễ gửi và dễ theo dõi.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={createFeedbackUrl}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0b56d9] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(11,86,217,0.23)] transition hover:-translate-y-0.5 hover:bg-[#0849bd]"
                >
                  <Lucide.MessageSquarePlus size={17} aria-hidden="true" />
                  Gửi phản ánh ngay
                </Link>
                <Link
                  to="/community/feed"
                  className="public-secondary-button inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700"
                >
                  <Lucide.Newspaper size={17} aria-hidden="true" />
                  Xem bảng tin công khai
                </Link>
              </div>

              <ul className="public-copy mt-6 grid max-w-[560px] gap-3 text-sm sm:grid-cols-2">
                <li className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <Lucide.Eye size={14} aria-hidden="true" />
                  </span>
                  Bảng tin và bản đồ xem công khai
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    <Lucide.ShieldCheck size={14} aria-hidden="true" />
                  </span>
                  {isAuthenticated ? 'Sẵn sàng gửi và theo dõi' : 'Đăng nhập để gửi và theo dõi'}
                </li>
              </ul>
            </header>

            <PublicMapPreview compact />
          </div>
        </section>

        <section data-public-reveal className="public-quick-section relative isolate overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(180deg,#f2f7ff_0%,#edf4fc_100%)]" aria-label="Truy cập nhanh">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute -left-20 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full bg-blue-300/20 blur-3xl" />
            <div className="absolute -right-12 top-0 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
            <svg viewBox="0 0 1440 180" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-blue-500/10" fill="none">
              <path d="M-40 132C170 62 318 156 520 92C720 29 888 141 1100 75C1234 34 1350 49 1490 98" stroke="currentColor" strokeWidth="1.5" />
              <path d="M-30 156C198 102 344 178 560 126C776 73 929 170 1150 112C1282 77 1382 81 1480 118" stroke="currentColor" strokeWidth="1" strokeDasharray="7 10" />
            </svg>
          </div>
          <div className="mx-auto grid w-full max-w-[1680px] gap-4 px-4 py-7 sm:px-6 md:grid-cols-3 lg:px-8 2xl:px-12">
            {quickAccessItems.map(({ title, description, to, icon: Icon, iconClassName }) => (
              <Link
                key={title}
                to={to}
                className="public-quick-card group relative flex items-start gap-4 overflow-hidden rounded-[20px] border p-4.5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-blue-300"
              >
                <span className="pointer-events-none absolute -right-9 -top-10 h-24 w-24 rounded-full border-[18px] border-blue-100/60 transition duration-300 group-hover:scale-110 dark:border-blue-500/10" aria-hidden="true" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-transparent transition duration-300 group-hover:scale-x-100" aria-hidden="true" />
                <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconClassName}`}>
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="public-heading block text-sm font-semibold">{title}</strong>
                  <span className="public-copy mt-1 block text-xs leading-5">{description}</span>
                </span>
                <Lucide.ArrowUpRight size={16} className="mt-1 shrink-0 text-slate-300 transition group-hover:text-blue-600" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section id="recent-feedbacks" data-public-reveal className="public-recent-section relative isolate overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_52%,#eef5ff_100%)] py-12 sm:py-14" aria-labelledby="recent-feedbacks-title">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute left-[7%] top-10 h-72 w-72 rounded-full bg-blue-200/28 blur-3xl dark:bg-blue-500/10" />
            <div className="absolute right-[4%] top-1/3 h-80 w-80 rounded-full bg-cyan-200/24 blur-3xl dark:bg-cyan-500/10" />
            <svg viewBox="0 0 1440 720" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-blue-500/10" fill="none">
              <path d="M-70 514C113 438 232 238 414 278C586 316 650 493 824 449C1004 404 1062 222 1254 244C1365 256 1420 310 1510 352" stroke="currentColor" strokeWidth="2" />
              <path d="M-60 588C130 528 270 361 454 393C631 424 705 561 885 521C1057 483 1154 348 1323 374C1403 386 1465 419 1510 447" stroke="currentColor" strokeWidth="1.4" strokeDasharray="8 12" />
              <circle cx="414" cy="278" r="7" fill="currentColor" />
              <circle cx="824" cy="449" r="8" fill="currentColor" />
              <circle cx="1254" cy="244" r="7" fill="currentColor" />
              <circle cx="1120" cy="118" r="4" fill="currentColor" opacity="0.7" />
              <circle cx="980" cy="580" r="5" fill="currentColor" opacity="0.45" />
              <circle cx="260" cy="160" r="4" fill="currentColor" opacity="0.55" />
            </svg>
            <div className="absolute left-8 top-1/2 hidden -translate-y-1/2 items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-500/50 2xl:flex dark:text-blue-300/30">
              <span className="h-px w-12 bg-blue-300/60 dark:bg-blue-500/30" />
              Cập nhật cộng đồng
            </div>
            <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-600/45 2xl:flex dark:text-cyan-300/30">
              Dữ liệu công khai
              <span className="h-px w-12 bg-cyan-300/60 dark:bg-cyan-500/30" />
            </div>
          </div>
          <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 2xl:px-12">
            <div className="public-recent-shell relative overflow-hidden rounded-[34px] border p-5 backdrop-blur sm:p-8">
              <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[42px] border-blue-50/90 dark:border-blue-500/5" aria-hidden="true" />
              <header className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                  Cập nhật từ cộng đồng
                </p>
                <h2 id="recent-feedbacks-title" className="public-heading mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-[38px]">
                  Phản ánh mới được cập nhật
                </h2>
                <p className="public-copy mt-3 max-w-2xl text-sm leading-6 sm:text-base">
                  Theo dõi những vấn đề đô thị mới được cộng đồng ghi nhận và cập nhật.
                </p>
              </div>
              <Link
                to="/community/feed"
                className="public-section-button inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                Xem tất cả phản ánh
                <Lucide.ArrowRight size={16} aria-hidden="true" />
              </Link>
            </header>

              <div className="relative mt-8">
                <PublicRecentFeedbacks
                  items={items}
                  loading={loading}
                  error={error}
                  onRetry={reload}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" data-public-reveal className="public-process-section relative isolate overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#eef5ff_100%)] py-12 sm:py-14" aria-labelledby="how-it-works-title">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute left-1/2 top-10 h-80 w-[760px] -translate-x-1/2 rounded-[50%] bg-blue-100/50 blur-3xl dark:bg-blue-500/5" />
            <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(37,99,235,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.05)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_80%,transparent)] dark:opacity-20" />
            <svg viewBox="0 0 1440 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-cyan-500/10" fill="none">
              <path d="M-50 470C180 382 300 494 510 405C704 323 862 445 1060 362C1220 294 1341 327 1490 394" stroke="currentColor" strokeWidth="2" />
            </svg>
            <div className="absolute left-[9%] top-[28%] h-2 w-2 rounded-full bg-blue-400/55 shadow-[0_0_0_10px_rgba(59,130,246,0.06)]" />
            <div className="absolute right-[11%] top-[34%] h-2.5 w-2.5 rounded-full bg-cyan-400/55 shadow-[0_0_0_12px_rgba(34,211,238,0.06)]" />
            <div className="absolute left-1/2 bottom-[12%] h-2 w-2 rounded-full bg-indigo-400/45 shadow-[0_0_0_9px_rgba(99,102,241,0.05)]" />
          </div>
          <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 2xl:px-12">
            <header className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                Một quy trình rõ ràng
              </p>
              <h2 id="how-it-works-title" className="public-heading mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-[38px]">
                Từ thông tin của người dân đến kết quả xử lý
              </h2>
              <p className="public-copy mt-3 text-sm leading-6 sm:text-base">
                Mỗi bước được trình bày minh bạch để người gửi biết phản ánh đang ở đâu trong quy trình.
              </p>
            </header>

            <ol className="relative mt-10 grid gap-5 lg:grid-cols-3">
              <span className="public-process-line absolute left-[16.6%] right-[16.6%] top-9 hidden h-px bg-slate-200 lg:block" aria-hidden="true" />
              {processSteps.map(({ number, title, description, icon: Icon }) => (
                <li key={number} className="public-process-card group relative overflow-hidden rounded-[24px] border p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-blue-300">
                  <span className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full border-[24px] border-blue-50/80 transition duration-300 group-hover:scale-110 dark:border-blue-500/5" aria-hidden="true" />
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-transparent opacity-75" aria-hidden="true" />
                  <div className="relative flex items-center justify-between">
                    <span className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                      <Icon size={24} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold tracking-[0.12em] text-slate-300 dark:text-slate-600">{number}</span>
                  </div>
                  <h3 className="public-heading mt-5 text-lg font-semibold">{title}</h3>
                  <p className="public-copy mt-2 text-sm leading-6">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section data-public-reveal className="public-cta-section relative isolate overflow-hidden bg-[linear-gradient(120deg,#0a327e_0%,#0b56d9_48%,#0891b2_135%)] text-white">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full border-[46px] border-white/5" />
            <div className="absolute -right-16 -bottom-28 h-80 w-80 rounded-full bg-cyan-300/10 blur-2xl" />
            <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-white/12" fill="none">
              <path d="M-50 166C171 92 327 194 541 118C744 46 902 177 1110 105C1250 57 1367 72 1490 119" stroke="currentColor" strokeWidth="2" />
              <path d="M-40 194C190 139 344 218 560 164C778 109 939 206 1161 151C1294 118 1386 122 1490 154" stroke="currentColor" strokeWidth="1.2" strokeDasharray="8 11" />
            </svg>
          </div>
          <div className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-11 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 2xl:px-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">Bắt đầu từ một phản ánh rõ ràng</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Gửi thông tin, theo dõi tiến độ và cùng cải thiện khu vực sống.</h2>
            </div>
            <Link
              to={createFeedbackUrl}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5"
            >
              Gửi phản ánh mới
              <Lucide.ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
        </main>
      </PublicPageMotion>
    </PublicLayout>
  );
};

export default LandingPage;
