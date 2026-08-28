import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  Footprints,
  GraduationCap,
  Heart,
  Info,
  MapPin,
  Medal,
  Menu,
  Search,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { courses } from "./data";
import {
  calculateConsecutiveTravel,
  courseHitsBlocked,
  coursesClash,
  GlobalCondition,
  optimize,
  scheduleSlots,
} from "./optimizer";
import { Course, Day, ScheduleResult } from "./types";
const days: Day[] = ["월", "화", "수", "목", "금"];
type ServiceMode = "pick" | "stuff";
const groupedGeneralCourseNames = new Set([
  "명저읽기", "사고와글쓰기", "데이터와코딩", "커뮤니케이션영어",
  "커뮤니케이션중국어", "커뮤니케이션일본어", "디지털추론과문제해결",
  "디지털실무및활용", "디지털응용", "대학수학", "일반물리학", "일반화학",
  "화학및실험I", "미래설계Ⅱ", "영어회화", "영어회화2",
]);
const normalizedCourseName = (name: string) => name.replace(/\s+/g, "");
const globalConditions: {
  key: GlobalCondition;
  label: string;
  desc: string;
  icon: typeof Footprints;
}[] = [
  {
    key: "credits",
    label: "최대학점",
    desc: "가능한 많은 후보 강의를 담아요",
    icon: GraduationCap,
  },
  {
    key: "gaps",
    label: "공강 최소화",
    desc: "수업 사이 빈 시간을 줄여요",
    icon: Clock3,
  },
  {
    key: "days",
    label: "등교일 최소화",
    desc: "수업을 적은 요일에 모아요",
    icon: CalendarDays,
  },
];
const tm = (n: number) => {
  const totalMinutes = Math.round(n * 60);
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};
const courseTime = (c: Course) =>
  c.meetings.map((m) => `${m.day} ${tm(m.start)}–${tm(m.end)}`).join(" · ");
const min = (n: number) =>
  n >= 60 ? `${Math.floor(n / 60)}시간 ${n % 60 || ""}분` : `${n}분`;
const travelTime = (minutes: number) => {
  const seconds = Math.round(minutes * 60),
    wholeMinutes = Math.floor(seconds / 60),
    remainingSeconds = seconds % 60;
  return `${wholeMinutes ? `${wholeMinutes}분` : ""}${remainingSeconds ? ` ${remainingSeconds}초` : ""}`.trim() || "0분";
};
const pickGuidePages = [
  {
    title: "강의 담기 & 조건 설정",
    subtitle: "STEP 1에서 강의를 골라 담고, STEP 2에서 조건을 정해요.",
    items: [
      [
        "1",
        "강의 검색과 분류",
        "강의명·교수명·과목코드로 검색하고, 전체/전공/교양/기타 탭으로 좁혀보세요.",
      ],
      [
        "2",
        "후보 강의 담기",
        "마음에 드는 강의 카드를 체크하면 후보로 담겨요. 시간이 겹쳐도 이 단계에서는 괜찮아요.",
      ],
      [
        "3",
        "조건 설정으로 이동",
        "하단에서 담은 강의 수를 확인하고 ‘조건 설정하기’를 누르세요.",
      ],
      [
        "4",
        "희망 공강시간 표시",
        "비워두고 싶은 시간을 시간표에서 직접 칠해 희망 공강시간으로 지정하세요.",
      ],
      [
        "5",
        "최적화 조건 선택",
        "최대학점·공강 최소화·등교일 최소화 중 원하는 조건만 골라 체크하세요.",
      ],
      [
        "6",
        "필수과목 지정",
        "꼭 들어야 하는 과목은 필수로 지정하세요. 시간이 겹치는 과목은 함께 지정할 수 없어요.",
      ],
    ],
  },
  {
    title: "시간표 생성과 추천 결과 확인",
    subtitle: "조건을 다 설정하면, 다음은 자동이에요.",
    items: [
      [
        "7",
        "추천 결과 비교",
        "1위·2위·3위 탭을 누르면 각 추천 점수와 시간표를 바로 비교할 수 있어요.",
      ],
      [
        "8",
        "시간표와 요약 확인",
        "총학점·등교일·공강시간·이동시간과 포함된 강의를 한 번에 확인하세요.",
      ],
      [
        "9",
        "포함·제외 강의 확인",
        "시간표에 포함된 강의와 제외된 후보 강의를 목록으로 확인할 수 있어요.",
      ],
      [
        "10",
        "시간표 저장하기",
        "마음에 드는 결과를 찾았다면 ‘이미지로 저장’을 눌러 PNG 시간표로 보관하세요.",
      ],
    ],
  },
] as const;
const stuffGuidePages = [
  {
    title: "지금 듣는 강의 등록",
    subtitle: "캡처로 불러오거나 검색해서 현재 시간표를 등록해요.",
    items: [
      [
        "1",
        "시간표 캡처 불러오기",
        "현재 시간표 캡처를 올리면 무료 OCR이 강의를 자동으로 찾아요. 베타 기능이므로 결과를 꼭 확인하고 수정하세요.",
      ],
      [
        "2",
        "직접 검색하기",
        "캡처가 어렵거나 누락된 과목은 강의명·교수명·과목코드로 직접 검색하세요.",
      ],
      [
        "3",
        "현재 강의 선택",
        "지금 듣고 있는 실제 강의와 분반을 확인한 뒤 카드에 체크해 담으세요.",
      ],
    ],
  },
  {
    title: "공강에 맞는 강의 채우기",
    subtitle: "현재 시간표를 보면서 빈칸에 들어갈 강의를 골라요.",
    items: [
      [
        "4",
        "현재 시간표 확인",
        "등록한 강의가 왼쪽 시간표에 표시돼요. 현재 강의를 수정하거나 완성본을 이미지로 저장할 수 있어요.",
      ],
      [
        "5",
        "요일별 강의 찾기",
        "추가할 강의를 검색하고 전체·월요일·화요일·수요일·목요일·금요일 필터로 좁혀보세요.",
      ],
      [
        "6",
        "강의 선택해 채우기",
        "추천 카드를 누르면 시간표에 바로 추가돼요. 이미 선택한 수업과 겹치는 과목은 선택할 수 없어요.",
      ],
    ],
  },
] as const;
function GuideModal({
  close,
  mode,
}: {
  close: () => void;
  mode: ServiceMode;
}) {
  const [page, setPage] = useState(0),
    pages = mode === "stuff" ? stuffGuidePages : pickGuidePages,
    data = pages[page],
    isStuff = mode === "stuff";
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", key);
    };
  }, [close]);
  return (
    <div
      className="guide-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section
        className="guide-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${isStuff ? "쑤셔담기" : "골라담기"} 이용 가이드`}
      >
        <header>
          <div className="guide-logo">
            <i>
              <Sparkles />
            </i>
            <span>
              {isStuff ? "쑤셔넣는" : "골라담는"} <b>시간표</b>
            </span>
          </div>
          <em>가이드 {page + 1}/2</em>
          <button onClick={close} aria-label="이용 가이드 닫기">
            <X />
          </button>
        </header>
        <div className="guide-intro">
          <mark>
            {isStuff
              ? page
                ? "STEP 2 · 공강 채우기"
                : "STEP 1 · 현재 강의 등록"
              : `STEP ${page ? 3 : 1} · ${page ? "시간표 생성" : "강의 선택"}`}
          </mark>
          <h2>{data.title}</h2>
          <p>{data.subtitle}</p>
        </div>
        <div className="guide-list">
          {data.items.map(([number, title, description]) => (
            <article key={number}>
              <strong>{number}</strong>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
        <footer>
          <button
            className="secondary"
            disabled={!page}
            onClick={() => setPage((current) => current - 1)}
          >
            <ArrowLeft /> 이전
          </button>
          <span>
            {pages.map((_, i) => (
              <i key={i} className={page === i ? "on" : ""} />
            ))}
          </span>
          {page < pages.length - 1 ? (
            <button
              className="primary"
              onClick={() => setPage((current) => current + 1)}
            >
              다음 <ArrowRight />
            </button>
          ) : (
            <button className="primary" onClick={close}>
              <Check /> 확인했어요
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
function Header({
  step,
  mode,
  onModeChange,
}: {
  step: number;
  mode: ServiceMode | null;
  onModeChange: (mode: ServiceMode) => void;
}) {
  const [guideOpen, setGuideOpen] = useState(false),
    labels =
      mode === "stuff"
        ? ["현재 강의 선택", "빈칸 강의 추천"]
        : ["강의 선택", "조건 설정", "시간표 생성", "추천 결과"];
  return (
    <>
      <header>
        <div className="brand">
          <i>
            <Sparkles />
          </i>
          {mode ? (
            <div className="mode-switch" aria-label="시간표 모드 전환">
              <button
                className={mode === "pick" ? "on" : ""}
                onClick={() => onModeChange("pick")}
              >
                골라담는 <b>시간표</b>
              </button>
              <button
                className={mode === "stuff" ? "on" : ""}
                onClick={() => onModeChange("stuff")}
              >
                쑤셔넣는 <b>시간표</b>
              </button>
            </div>
          ) : (
            <>
              골라담는 <b>시간표</b>
            </>
          )}
        </div>
        <button className="semester">
          2026년 2학기 <ChevronDown />
        </button>
        <nav>
          <button className="guide" onClick={() => setGuideOpen(true)}>
            <Info /> 이용 가이드
          </button>
          <Menu className="hamb" />
        </nav>
      </header>
      {mode && (
        <div className="steps">
          {labels.map((x, i) => (
            <div
              className={`${step === i + 1 ? "now" : ""} ${step > i + 1 ? "done" : ""}`}
              key={x}
            >
              <span>{step > i + 1 ? <Check /> : i + 1}</span>
              <b>{x}</b>
              {i < labels.length - 1 && <i />}
            </div>
          ))}
        </div>
      )}
      <a
        className="syllabus-quick"
        href="https://stis1.scnu.ac.kr/generate/IPSI/index_real.jsp?v_Optn=SUP"
        target="_blank"
        rel="noreferrer"
        aria-label="강의계획서 보러가기"
      >
        <ExternalLink />
        <span>
          강의계획서
          <br />
          보러가기
        </span>
      </a>
      {guideOpen && (
        <GuideModal
          mode={mode ?? "pick"}
          close={() => setGuideOpen(false)}
        />
      )}
    </>
  );
}
function DataNotice() {
  return (
    <div className="data-notice">
      <Info />
      <span>
        <b>강의 목록 안내</b> CELL 과목, 광주·전남권역 대학 간 학점교류 과목 및
        토요일 교과목은 포함되어 있지 않습니다.
      </span>
    </div>
  );
}
function CourseCard({
  c,
  on,
  click,
  selectedText = "후보 강의에 담김",
  disabled = false,
  disabledText = "시간이 겹쳐 선택할 수 없어요",
}: {
  c: Course;
  on: boolean;
  click: () => void;
  selectedText?: string;
  disabled?: boolean;
  disabledText?: string;
}) {
  return (
    <button
      className={`course ${on ? "selected" : ""} ${disabled ? "course-disabled" : ""}`}
      onClick={click}
      disabled={disabled}
    >
      <div>
        <em>{c.category}</em>
        {c.category === "전공" && (
          <em
            className={`requirement ${c.requirement === "전공필수" ? "required-major" : "elective-major"}`}
          >
            {c.requirement}
          </em>
        )}
        {c.category === "전공" && c.grade && (
          <small className="course-grade">{c.grade}학년</small>
        )}
        <small>{c.credits}학점</small>
        <span>{on && <Check />}</span>
      </div>
      <h3>{c.name}</h3>
      <p>
        {c.code} · {c.professor} 교수
      </p>
      <footer>
        <label>
          <Clock3 />
          {courseTime(c)}
        </label>
        <label>
          <MapPin />
          {c.meetings[0].building}
        </label>
      </footer>
      {on && (
        <strong>
          <Check /> {selectedText}
        </strong>
      )}
      {disabled && disabledText && (
        <strong className="conflict-text">{disabledText}</strong>
      )}
    </button>
  );
}
function GroupedCourseCard({
  group,
  ids,
  toggle,
  stuff,
  chosen,
}: {
  group: Course[];
  ids: Set<string>;
  toggle: (id: string) => void;
  stuff: boolean;
  chosen: Course[];
}) {
  const [open, setOpen] = useState(false),
    closeTimer = useRef<number | null>(null),
    sorted = [...group].sort((a, b) => {
      const am = a.meetings[0], bm = b.meetings[0];
      return (
        days.indexOf(am.day) - days.indexOf(bm.day) ||
        am.start - bm.start ||
        a.professor.localeCompare(b.professor, "ko")
      );
    }),
    selectedCount = group.filter((course) => ids.has(course.id)).length,
    representative = group[0];
  const cancelClose = () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    },
    scheduleClose = (delay = 420) => {
      cancelClose();
      closeTimer.current = window.setTimeout(() => {
        setOpen(false);
        closeTimer.current = null;
      }, delay);
    };
  useEffect(() => () => cancelClose(), []);
  return (
    <div
      className={`grouped-course ${open ? "open" : ""}`}
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={() => scheduleClose()}
    >
      <button
        type="button"
        className={`course group-summary ${selectedCount ? "selected" : ""}`}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <div>
          <em>{representative.category}</em>
          <small>{representative.credits}학점</small>
          <span><ChevronDown /></span>
        </div>
        <h3>{representative.name}</h3>
        <p>교수님·시간별 분반을 펼쳐서 선택하세요</p>
        <footer>
          <label><BookOpen /> {group.length}개 분반</label>
          <label>{selectedCount ? `${selectedCount}개 담김` : "분반 보기"}</label>
        </footer>
      </button>
      {open && (
        <button
          type="button"
          className="section-picker-backdrop"
          aria-label="분반 선택창 닫기"
          onClick={() => setOpen(false)}
        />
      )}
      <section
        className="section-picker"
        aria-label={`${representative.name} 분반 목록`}
        onMouseEnter={cancelClose}
        onMouseLeave={() => scheduleClose(160)}
      >
        <header>
          <div>
            <b>{representative.name}</b>
            <small>{group.length}개 분반 · 요일과 시간순</small>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="닫기"><X /></button>
        </header>
        <div>
          {sorted.map((course) => {
            const selected = ids.has(course.id),
              disabled =
                stuff &&
                !selected &&
                chosen.some((other) => coursesClash(other, course));
            return (
              <button
                type="button"
                key={course.id}
                className={selected ? "selected" : ""}
                disabled={disabled}
                onClick={() => toggle(course.id)}
              >
                <i>{selected && <Check />}</i>
                <span>
                  <b>{course.professor} 교수</b>
                  <small>{course.code} · {courseTime(course)}</small>
                  <small><MapPin /> {course.meetings[0].building}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
async function prepareOcrImage(file: File) {
  try {
    const bitmap = await createImageBitmap(file),
      scale = Math.min(3, Math.max(1.5, 2000 / bitmap.width)),
      canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const gray =
        image.data[i] * 0.299 +
        image.data[i + 1] * 0.587 +
        image.data[i + 2] * 0.114;
      const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.65 + 128));
      image.data[i] = image.data[i + 1] = image.data[i + 2] = contrasted;
    }
    ctx.putImageData(image, 0, 0);
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob || file), "image/png"),
    );
  } catch {
    return file;
  }
}
const cleanText = (value: string) =>
  value.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
function textSimilarity(a: string, b: string) {
  const x = cleanText(a),
    y = cleanText(b);
  if (!x || !y) return 0;
  if (x.includes(y) || y.includes(x))
    return Math.min(x.length, y.length) / Math.max(x.length, y.length);
  const grams = (s: string) =>
      Array.from({ length: Math.max(0, s.length - 1) }, (_, i) =>
        s.slice(i, i + 2),
      ),
    ga = grams(x),
    gb = grams(y);
  let hit = 0;
  const rest = [...gb];
  ga.forEach((gram) => {
    const index = rest.indexOf(gram);
    if (index >= 0) {
      hit++;
      rest.splice(index, 1);
    }
  });
  return ga.length + gb.length ? (2 * hit) / (ga.length + gb.length) : 0;
}
function OcrImport({
  ids,
  setIds,
}: {
  ids: Set<string>;
  setIds: (next: Set<string>) => void;
}) {
  const [progress, setProgress] = useState(0),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [matches, setMatches] = useState<{ course: Course; confidence: number }[]>(
      [],
    ),
    [preview, setPreview] = useState("");
  const recognize = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setStatus("한글 OCR 준비 중");
    setMatches([]);
    const url = URL.createObjectURL(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["kor", "eng"], undefined, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round((m.progress || 0) * 100));
            setStatus("시간표 글자를 읽는 중");
          }
        },
      });
      const processed = await prepareOcrImage(file);
      const result = await worker.recognize(processed);
      await worker.terminate();
      const raw = result.data.text,
        lines = raw
          .split(/\r?\n/)
          .map(cleanText)
          .filter((line) => line.length >= 2),
        whole = cleanText(raw);
      const found = courses
        .map((course) => {
          const name = cleanText(course.name),
            code = cleanText(course.code),
            exact = name.length >= 3 && whole.includes(name),
            codeHit = code.length >= 4 && whole.includes(code),
            similar = Math.max(
              0,
              ...lines.map((line) => textSimilarity(name, line)),
            );
          return {
            course,
            confidence: Math.round(
              Math.min(99, (codeHit ? 0.99 : exact ? 0.96 : similar) * 100),
            ),
          };
        })
        .filter((item) => item.confidence >= 58)
        .sort((a, b) => b.confidence - a.confidence)
        .filter(
          (item, index, all) =>
            all.findIndex((other) => other.course.code === item.course.code) ===
            index,
        )
        .slice(0, 20);
      setMatches(found);
      const next = new Set(ids);
      found
        .filter((item) => item.confidence >= 72)
        .forEach(({ course }) => {
          if (
            courses
              .filter((selected) => next.has(selected.id))
              .every((selected) => !coursesClash(selected, course))
          )
            next.add(course.id);
        });
      setIds(next);
      setStatus(
        found.length
          ? `${found.length}개 후보를 찾았어요. 자동 선택 결과를 꼭 확인하고 수정해 주세요.`
          : "일치하는 강의를 찾지 못했어요. 아래에서 직접 추가해 주세요.",
      );
    } catch (error) {
      console.error(error);
      setStatus(
        "이미지를 읽지 못했어요. 다른 캡처를 사용하거나 아래에서 직접 추가해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };
  const toggle = (course: Course) => {
    const next = new Set(ids);
    if (next.has(course.id)) next.delete(course.id);
    else if (
      courses
        .filter((selected) => next.has(selected.id))
        .every((selected) => !coursesClash(selected, course))
    )
      next.add(course.id);
    setIds(next);
  };
  return (
    <section className="ocr-import">
      <div className="ocr-copy">
        <i>
          <Search />
        </i>
        <div>
          <h2>
            시간표 캡처로 불러오기 <em>BETA</em>
          </h2>
          <p>
            무료 OCR 테스트 기능이라 부정확할 수 있어요. 자동으로 찾은 과목을
            반드시 확인하고, 틀린 항목은 해제하거나 직접 추가해 주세요.
          </p>
        </div>
      </div>
      <label className="ocr-drop">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => recognize(e.target.files?.[0])}
        />
        {preview ? (
          <img src={preview} alt="업로드한 시간표 미리보기" />
        ) : (
          <>
            <Download />
            <b>시간표 캡처 선택하기</b>
            <small>PNG · JPG · WEBP</small>
          </>
        )}
      </label>
      {busy && (
        <div className="ocr-progress">
          <span>
            <i style={{ width: `${progress}%` }} />
          </span>
          <b>
            {status} · {progress}%
          </b>
        </div>
      )}
      {!busy && status && (
        <p className="ocr-status">
          <Info />
          {status}
        </p>
      )}
      {matches.length > 0 && (
        <div className="ocr-matches">
          {matches.map(({ course, confidence }) => (
            <button
              key={course.id}
              className={ids.has(course.id) ? "on" : ""}
              onClick={() => toggle(course)}
            >
              <i>{ids.has(course.id) && <Check />}</i>
              <span>
                <b>{course.name}</b>
                <small>
                  {course.code} · {courseTime(course)}
                </small>
              </span>
              <em>{confidence}% 일치</em>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
function Select({
  ids,
  setIds,
  next,
  mode = "pick",
}: {
  ids: Set<string>;
  setIds: (x: Set<string>) => void;
  next: () => void;
  mode?: ServiceMode;
}) {
  const [q, setQ] = useState(""),
    [cat, setCat] = useState("전체"),
    [selectedGroups, setSelectedGroups] = useState(new Set<string>());
  const groups =
      cat === "전공"
        ? [
            ...new Set(
              courses
                .filter((c) => c.category === "전공")
                .map((c) => c.department || "학과 미지정"),
            ),
          ].sort()
        : [],
    list = courses.filter(
      (c) =>
        (cat === "전체" || c.category === cat) &&
        (cat !== "전공" ||
          !selectedGroups.size ||
          selectedGroups.has(c.department || "")) &&
        (c.name.includes(q) ||
          c.professor.includes(q) ||
          c.code.toLowerCase().includes(q.toLowerCase())),
    ),
    chosen = courses.filter((course) => ids.has(course.id)),
    toggle = (id: string) => {
      const x = new Set(ids);
      if (x.has(id)) {
        x.delete(id);
      } else {
        const target = courses.find((c) => c.id === id)!;
        if (
          mode === "stuff" &&
          courses.filter((c) => x.has(c.id)).some((c) => coursesClash(c, target))
        ) {
          return;
        }
        x.add(id);
      }
      setIds(x);
    },
    changeCat = (x: string) => {
      setCat(x);
      setSelectedGroups(new Set());
    },
    toggleGroup = (group: string) => {
      const x = new Set(selectedGroups);
      x.has(group) ? x.delete(group) : x.add(group);
      setSelectedGroups(x);
    },
    stuff = mode === "stuff";
  const groupedItems: (Course | Course[])[] = [], seenGroups = new Set<string>();
  list.forEach((course) => {
    const key = normalizedCourseName(course.name);
    if (!groupedGeneralCourseNames.has(key)) {
      groupedItems.push(course);
      return;
    }
    if (seenGroups.has(key)) return;
    seenGroups.add(key);
    groupedItems.push(list.filter((item) => normalizedCourseName(item.name) === key));
  });
  return (
    <main>
      <div className="hero">
        <div>
          <mark>
            <Sparkles /> STEP 1
          </mark>
          <h1>
            {stuff
              ? "지금 듣는 강의를 알려주세요"
              : "이번 학기, 어떤 강의를 듣고 싶나요?"}
          </h1>
          <p>
            {stuff
              ? "현재 수강 중인 과목을 선택하면 남은 빈칸을 찾아드려요."
              : "2026학년도 2학기 실제 개설 강의에서 자유롭게 선택해보세요."}
          </p>
        </div>
        <aside>
          <Info />
          <span>
            <b>{stuff ? "현재 시간표 등록" : "강의 목록 등록 완료"}</b>{" "}
            {stuff
              ? "실제로 신청한 강의만 선택해 주세요."
              : "학교 게시용 시간표에서 추출한 공통 강의 목록을 모두 함께 사용해요."}
          </span>
        </aside>
      </div>
      {stuff && <OcrImport ids={ids} setIds={setIds} />}
      {stuff && (
        <div className="stuff-selection-note">
          <Info /> 연하게 표시된 강의는 선택한 과목과 시간이 겹쳐 담을 수 없어요.
        </div>
      )}
      <div className="tools course-tools">
        <label>
          <Search />
          <input
            placeholder="강의명, 교수명, 과목코드 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div>
          {["전체", "전공", "교양", "기타"].map((x) => (
            <button
              key={x}
              className={cat === x ? "on" : ""}
              onClick={() => changeCat(x)}
            >
              {x}
            </button>
          ))}
        </div>
        <small>
          총 <b>{list.length}</b>개 강의
        </small>
      </div>
      {cat === "전공" && (
        <div className="group-check-panel">
          <div className="group-check-head">
            <span>
              <b>학과·전공 선택</b> 여러 항목을 동시에 선택할 수 있어요.
            </span>
            <em>
              {selectedGroups.size
                ? `${selectedGroups.size}개 선택`
                : "전체 표시"}
            </em>
            {selectedGroups.size > 0 && (
              <button onClick={() => setSelectedGroups(new Set())}>
                전체 해제
              </button>
            )}
          </div>
          <div className="group-check-grid">
            {groups.map((group) => (
              <button
                className={selectedGroups.has(group) ? "on" : ""}
                onClick={() => toggleGroup(group)}
                key={group}
              >
                <i>{selectedGroups.has(group) && <Check />}</i>
                <span>{group}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="course-grid">
        {groupedItems.map((item) => {
          if (Array.isArray(item)) {
            return (
              <GroupedCourseCard
                key={`group-${normalizedCourseName(item[0].name)}`}
                group={item}
                ids={ids}
                toggle={toggle}
                stuff={stuff}
                chosen={chosen}
              />
            );
          }
          const c = item;
          const selected = ids.has(c.id),
            disabled =
              stuff &&
              !selected &&
              chosen.some((course) => coursesClash(course, c));
          return (
            <CourseCard
              key={c.id}
              c={c}
              on={selected}
              click={() => toggle(c.id)}
              disabled={disabled}
              disabledText=""
              selectedText={stuff ? "현재 수강 과목" : "후보 강의에 담김"}
            />
          );
        })}
      </div>
      <div className="dock">
        <div className="bag">
          <BookOpen />
          <i>{ids.size}</i>
        </div>
        <div>
          <b>{ids.size}개 강의 선택됨</b>
          <small>
            {courses
              .filter((c) => ids.has(c.id))
              .reduce((s, c) => s + c.credits, 0)}
            학점 · {stuff ? "시간 중복 불가" : "시간 중복 허용"}
          </small>
        </div>
        <div className="pills">
          {courses
            .filter((c) => ids.has(c.id))
            .slice(0, 4)
            .map((c) => (
              <span key={c.id}>
                {c.name}
                <X onClick={() => toggle(c.id)} />
              </span>
            ))}
        </div>
        <button className="primary" disabled={!ids.size} onClick={next}>
          {stuff ? "빈칸 강의 찾기" : "조건 설정하기"} <ArrowRight />
        </button>
      </div>
    </main>
  );
}
function BlockPainter({
  blocked,
  setBlocked,
}: {
  blocked: Set<string>;
  setBlocked: (x: Set<string>) => void;
}) {
  const [painting, setPainting] = useState(false),
    [mode, setMode] = useState<"add" | "remove">("add");
  const paint = (day: Day, id: string, start = false) => {
    const key = `${day}-${id}`,
      next = new Set(blocked);
    if (start) {
      setPainting(true);
      setMode(next.has(key) ? "remove" : "add");
      next.has(key) ? next.delete(key) : next.add(key);
    } else if (painting) {
      mode === "add" ? next.add(key) : next.delete(key);
    }
    setBlocked(next);
  };
  return (
    <div
      className="block-painter period-painter"
      onPointerLeave={() => setPainting(false)}
      onPointerUp={() => setPainting(false)}
    >
      <div className="paint-head">
        <span>교시 / 시간</span>
        {days.map((d) => (
          <b>{d}요일</b>
        ))}
      </div>
      <div className="paint-body">
        <div className="lunch-guide" aria-hidden="true">
          <span>
            <b>🍚🥄 이 시간만큼은 비워둘까요?</b>
            <small>점심은 꼭 챙겨 먹어요! 😋</small>
          </span>
        </div>
        <aside>
          {scheduleSlots.map((slot) => (
            <span className={slot.type} key={slot.id}>
              <b>{slot.label}</b>
              {slot.time}
            </span>
          ))}
        </aside>
        {days.map((day) => (
          <div className="paint-day" key={day}>
            {scheduleSlots.map((slot) => (
              <button
                key={slot.id}
                className={`${slot.type} ${blocked.has(`${day}-${slot.id}`) ? "blocked" : ""}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  paint(day, slot.id, true);
                }}
                onPointerEnter={() => paint(day, slot.id)}
                aria-label={`${day} ${slot.label} ${slot.time}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
function RequiredPicker({
  chosen,
  required,
  setRequired,
  blocked,
}: {
  chosen: Course[];
  required: Set<string>;
  setRequired: (x: Set<string>) => void;
  blocked: Set<string>;
}) {
  const selected = chosen.filter((c) => required.has(c.id));
  return (
    <div className="required-list">
      {chosen.map((c) => {
        const isRequired = required.has(c.id),
          timeConflict =
            !isRequired && selected.find((r) => coursesClash(c, r)),
          blockedConflict = !isRequired && courseHitsBlocked(c, blocked),
          disabled = !!timeConflict || blockedConflict;
        const click = () => {
          if (disabled) return;
          const x = new Set(required);
          isRequired ? x.delete(c.id) : x.add(c.id);
          setRequired(x);
        };
        return (
          <button
            className={`${isRequired ? "on" : ""} ${disabled ? "conflicted" : ""}`}
            onClick={click}
            disabled={disabled}
            key={c.id}
          >
            <i>{isRequired && <Check />}</i>
            <label style={{ background: c.color }} />
            <span>
              <b>{c.name}</b>
              <small>
                {c.code} · {c.professor} · {courseTime(c)}
              </small>
              {disabled && (
                <small className="required-error">
                  {timeConflict
                    ? `${timeConflict.name}과(와) 시간이 겹쳐요`
                    : "비워둘 시간과 겹쳐요"}
                </small>
              )}
            </span>
            <em>{c.credits}학점</em>
            {isRequired && (
              <strong>
                <Heart fill="currentColor" /> 필수
              </strong>
            )}
          </button>
        );
      })}
    </div>
  );
}
function Settings({
  ids,
  required,
  setRequired,
  blocked,
  setBlocked,
  enabled,
  setEnabled,
  back,
  next,
}: {
  ids: Set<string>;
  required: Set<string>;
  setRequired: (x: Set<string>) => void;
  blocked: Set<string>;
  setBlocked: (x: Set<string>) => void;
  enabled: Set<GlobalCondition>;
  setEnabled: (x: Set<GlobalCondition>) => void;
  back: () => void;
  next: () => void;
}) {
  const chosen = courses.filter((c) => ids.has(c.id)),
    toggleGlobal = (key: GlobalCondition) => {
      const x = new Set(enabled);
      x.has(key) ? x.delete(key) : x.add(key);
      setEnabled(x);
    },
    conflicts = chosen.filter(
      (c) => required.has(c.id) && courseHitsBlocked(c, blocked),
    );
  return (
    <main className="narrow">
      <button className="back" onClick={back}>
        <ArrowLeft /> 강의 선택으로
      </button>
      <div className="title">
        <mark>
          <Sparkles /> STEP 2
        </mark>
        <h1>비워두고 싶은 시간을 칠해주세요</h1>
        <p>
          시간표를 드래그하면 빨간색으로 표시되고, 그 시간에는 수업을 배치하지
          않아요.
        </p>
      </div>
      <section className="availability-section">
        <div className="section-title">
          <i>
            <CalendarDays />
          </i>
          <span>
            <h2>희망 공강 시간</h2>
            <p>09:00부터 18:00까지 1시간 단위로 선택할 수 있어요.</p>
          </span>
          <button
            className="clear-blocks"
            onClick={() => setBlocked(new Set())}
            disabled={!blocked.size}
          >
            전체 지우기
          </button>
        </div>
        <BlockPainter blocked={blocked} setBlocked={setBlocked} />
        <div className="paint-legend">
          <span>
            <i /> 수업 가능한 시간
          </span>
          <span>
            <i /> 비워둘 시간
          </span>
          <b>
            {blocked.size
              ? `${blocked.size}시간 선택됨`
              : "표를 드래그해 보세요"}
          </b>
        </div>
        {conflicts.length > 0 && (
          <div className="conflict-warning">
            <Info />
            <span>
              <b>필수과목과 공강 시간이 겹쳐요</b>
              <small>
                {conflicts.map((c) => c.name).join(", ")}의 시간 표시를
                지워주세요.
              </small>
            </span>
          </div>
        )}
      </section>
      <section>
        <div className="section-title">
          <i className="heart">
            <Heart />
          </i>
          <span>
            <h2>
              필수과목 지정 <em>선택</em>
            </h2>
            <p>시간이 겹치는 과목은 필수로 함께 선택할 수 없어요.</p>
          </span>
          <strong>{required.size}개 필수</strong>
        </div>
        <RequiredPicker
          chosen={chosen}
          required={required}
          setRequired={setRequired}
          blocked={blocked}
        />
      </section>
      <section className="optimization-section">
        <div className="section-title">
          <i>
            <Check />
          </i>
          <span>
            <h2>추가 최적화 조건</h2>
            <p>
              원하는 조건만 체크하세요. 선택한 조건은 동일한 비중으로
              계산됩니다.
            </p>
          </span>
        </div>
        <div className="global-checks">
          {globalConditions.map(({ key, label, desc, icon: Icon }) => (
            <button
              className={enabled.has(key) ? "on" : ""}
              onClick={() => toggleGlobal(key)}
              key={key}
            >
              <i>{enabled.has(key) && <Check />}</i>
              <Icon />
              <span>
                <b>{label}</b>
                <small>{desc}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <div className="actions">
        <button className="secondary" onClick={back}>
          <ArrowLeft /> 이전
        </button>
        <button
          className="primary"
          disabled={conflicts.length > 0}
          onClick={next}
        >
          <Sparkles /> 시간표 생성하기
        </button>
      </div>
    </main>
  );
}
function Loading({ done }: { done: () => void }) {
  useEffect(() => {
    const t = setTimeout(done, 1500);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <main className="loading">
      <div>
        <Sparkles />
      </div>
      <h1>최적의 시간표를 찾고 있어요</h1>
      <p>강의 시간 충돌을 확인하고, 설정한 조건을 꼼꼼하게 계산 중이에요.</p>
      <i>
        <span />
      </i>
      <small>
        <Check /> 시간 충돌 분석　 <Check /> 조건별 점수 계산　 <Clock3 /> TOP 3
        선별
      </small>
    </main>
  );
}
function Table({ list }: { list: Course[] }) {
  const start = 9,
    end = 23,
    hours = Array.from({ length: end - start + 1 }, (_, i) => start + i),
    rows = end - start;
  return (
    <div className="table timetable-full">
      <div />
      {days.map((d) => (
        <b key={d}>{d}요일</b>
      ))}
      <aside style={{ gridTemplateRows: `repeat(${rows},1fr)` }}>
        {hours.map((h) => (
          <span key={h}>{String(h).padStart(2, "0")}:00</span>
        ))}
      </aside>
      {days.map((day) => (
        <section key={day} style={{ gridTemplateRows: `repeat(${rows},1fr)` }}>
          {hours.slice(0, -1).map((h) => (
            <i key={h} />
          ))}
          {list.flatMap((c) =>
            c.meetings
              .filter((m) => m.day === day)
              .map((m, i) => (
                <div
                  key={`${c.id}-${i}`}
                  style={{
                    top: `${((m.start - start) / rows) * 100}%`,
                    height: `${((m.end - m.start) / rows) * 100}%`,
                    background: c.color,
                  }}
                >
                  <b>{c.name}</b>
                    <small>{c.code} · {m.building}</small>
                </div>
              )),
          )}
        </section>
      ))}
    </div>
  );
}
function saveScheduleImage(
  result: ScheduleResult,
  rank: number,
  options: { kind?: "pick" | "stuff"; currentCount?: number; addedCount?: number } = {},
) {
  const isStuff = options.kind === "stuff";
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = 1400;
  canvas.height = 1180;
  ctx.fillStyle = "#fafaff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#6c5ce7";
  ctx.fillRect(0, 0, canvas.width, 16);
  ctx.fillStyle = "#29263d";
  ctx.font = '800 42px "Noto Sans KR", sans-serif';
  ctx.fillText(isStuff ? "쑤셔넣는 시간표" : "골라담는 시간표", 70, 82);
  ctx.fillStyle = "#777386";
  ctx.font = '500 22px "Noto Sans KR", sans-serif';
  ctx.fillText(
    isStuff ? "2026년 2학기 · 빈칸 강의 추가 결과" : `2026년 2학기 · TOP ${rank} 추천`,
    72,
    124,
  );
  ctx.textAlign = "right";
  ctx.fillStyle = "#6c5ce7";
  ctx.font = '800 40px "Noto Sans KR", sans-serif';
  ctx.fillText(isStuff ? `${result.credits}학점` : `${result.score}점`, 1330, 84);
  ctx.font = '500 18px "Noto Sans KR", sans-serif';
  ctx.fillStyle = "#777386";
  ctx.fillText(
    isStuff
      ? `기존 ${options.currentCount || 0}과목  ·  추가 ${options.addedCount || 0}과목  ·  주 ${result.days}일`
      : `${result.credits}학점  ·  주 ${result.days}일  ·  공강 ${min(result.gapMinutes)}`,
    1330,
    122,
  );
  ctx.textAlign = "left";
  const left = 110,
    top = 205,
    timeWidth = 90,
    colWidth = 238,
    rowHeight = 62,
    startHour = 9,
    endHour = 23;
  ctx.fillStyle = "#f0edff";
  ctx.fillRect(left, top, timeWidth + colWidth * 5, 58);
  ctx.strokeStyle = "#dedbe8";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    left,
    top,
    timeWidth + colWidth * 5,
    58 + rowHeight * (endHour - startHour),
  );
  ctx.fillStyle = "#4d475d";
  ctx.font = '700 19px "Noto Sans KR", sans-serif';
  ctx.textAlign = "center";
  days.forEach((day, i) =>
    ctx.fillText(
      `${day}요일`,
      left + timeWidth + colWidth * i + colWidth / 2,
      top + 37,
    ),
  );
  ctx.font = '500 16px "Noto Sans KR", sans-serif';
  for (let h = startHour; h < endHour; h++) {
    const y = top + 58 + (h - startHour) * rowHeight;
    ctx.strokeStyle = "#e9e7ef";
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + timeWidth + colWidth * 5, y);
    ctx.stroke();
    ctx.fillStyle = "#8c8997";
    ctx.fillText(
      `${String(h).padStart(2, "0")}:00`,
      left + timeWidth / 2,
      y + 37,
    );
  }
  for (let i = 0; i <= 5; i++) {
    const x = left + timeWidth + colWidth * i;
    ctx.strokeStyle = "#e2dfea";
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + 58 + rowHeight * (endHour - startHour));
    ctx.stroke();
  }
  result.courses.forEach((course) =>
    course.meetings.forEach((meeting) => {
      const dayIndex = days.indexOf(meeting.day);
      if (dayIndex < 0) return;
      const x = left + timeWidth + dayIndex * colWidth + 5,
        y = top + 58 + (meeting.start - startHour) * rowHeight + 3,
        w = colWidth - 10,
        h = Math.max(38, (meeting.end - meeting.start) * rowHeight - 6);
      ctx.fillStyle = course.color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 9);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 7, y + 5, w - 14, h - 10);
      ctx.clip();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.font = '700 16px "Noto Sans KR", sans-serif';
      ctx.fillText(course.name, x + 12, y + 25);
      ctx.font = '500 13px "Noto Sans KR", sans-serif';
      ctx.fillText(`${course.code} · ${meeting.building}`, x + 12, y + 47);
      ctx.restore();
    }),
  );
  ctx.textAlign = "left";
  ctx.fillStyle = "#777386";
  ctx.font = '500 17px "Noto Sans KR", sans-serif';
  ctx.fillText(
    isStuff
      ? `총 ${result.courses.length}과목  ·  공강 ${min(result.gapMinutes)}`
      : `총학점 ${result.credits}학점  ·  공강 ${min(result.gapMinutes)}  ·  포함 강의 ${result.courses.length}개`,
    110,
    1142,
  );
  const link = document.createElement("a");
  link.download = isStuff ? "쑤셔넣는시간표.png" : `골라담는시간표_TOP${rank}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
function saveStuffedScheduleImage(current: Course[], added: Course[]) {
  const list = [...current, ...added],
    activeDays = days.filter((day) =>
      list.some((course) => course.meetings.some((meeting) => meeting.day === day)),
    ),
    lunchDays = activeDays.filter(
      (day) =>
        !list.some((course) =>
          course.meetings.some(
            (meeting) => meeting.day === day && meeting.start < 13 && meeting.end > 12,
          ),
        ),
    ),
    gapMinutes = activeDays.reduce((total, day) => {
      const meetings = list
        .flatMap((course) => course.meetings)
        .filter((meeting) => meeting.day === day)
        .sort((a, b) => a.start - b.start);
      return (
        total +
        meetings.slice(1).reduce(
          (sum, meeting, index) => {
            const gap = Math.max(
              0,
              Math.round((meeting.start - meetings[index].end) * 60),
            );
            return sum + (gap > 10 ? gap : 0);
          },
          0,
        )
      );
    }, 0),
    result: ScheduleResult = {
      courses: list,
      excluded: [],
      credits: list.reduce((sum, course) => sum + course.credits, 0),
      days: activeDays.length,
      lunchRate: activeDays.length
        ? Math.round((lunchDays.length / activeDays.length) * 100)
        : 0,
      gapMinutes,
      moveMinutes: 0,
      moveDetails: [],
      morningCount: list.reduce(
        (count, course) =>
          count + course.meetings.filter((meeting) => meeting.start < 10).length,
        0,
      ),
      score: 0,
    };
  saveScheduleImage(result, 1, {
    kind: "stuff",
    currentCount: current.length,
    addedCount: added.length,
  });
}
function MoveDetails({ result }: { result: Pick<ScheduleResult, "moveMinutes" | "moveDetails"> }) {
  return (
    <section className="move-details">
      <h3>
        <Footprints /> 연강 이동시간{" "}
        {result.moveDetails.length > 0 && <b>총 {travelTime(result.moveMinutes)}</b>}
      </h3>
      <p className="move-data-note">
        연강 사이를 걸어서 이동한 기준이에요. 10분 이상은 빨간색으로 표시해요.
      </p>
      {result.moveDetails.length ? (
        result.moveDetails.map((m, i) => (
          <div key={`${m.day}-${i}`}>
            <strong>{m.day}</strong>
            <span>
              <b>{m.fromBuilding}</b>
              <small>{m.fromCourse}</small>
            </span>
            <ArrowRight />
            <span>
              <b>{m.toBuilding}</b>
              <small>{m.toCourse}</small>
            </span>
            <em className={m.minutes !== null && m.minutes >= 10 ? "long" : ""}>
              {m.minutes === null ? "정보 없음" : travelTime(m.minutes)}
            </em>
          </div>
        ))
      ) : (
        <p>강의실을 이동하는 연강이 없어요.</p>
      )}
    </section>
  );
}
function Results({
  rs,
  back,
  reset,
  useInStuff,
}: {
  rs: ScheduleResult[];
  back: () => void;
  reset: () => void;
  useInStuff: (selected: Course[]) => void;
}) {
  const [tab, setTab] = useState(0),
    r = rs[tab];
  if (!r)
    return (
      <main className="empty">
        <h1>가능한 시간표가 없어요</h1>
        <p>필수과목끼리 시간이 겹치는지 확인해 주세요.</p>
        <button className="primary" onClick={back}>
          조건 다시 설정
        </button>
      </main>
    );
  return (
    <main>
      <div className="result-head">
        <div>
          <mark>
            <Sparkles /> 분석 완료
          </mark>
          <h1>당신을 위한 TOP {rs.length} 시간표</h1>
          <p>설정한 조건을 바탕으로 가장 잘 맞는 조합을 찾았어요.</p>
        </div>
        <button className="secondary" onClick={reset}>
          처음부터 다시
        </button>
      </div>
      <div className="tabs">
        {rs.map((x, i) => (
          <button className={tab === i ? "on" : ""} onClick={() => setTab(i)}>
            <span>
              <Medal />
              {i + 1}위
            </span>
            <b>
              추천 점수 <strong>{x.score}</strong>
            </b>
            <small>
              {x.credits}학점 · 주 {x.days}일
            </small>
          </button>
        ))}
      </div>
      <div className="result-grid">
        <section className="schedule">
          <div>
            <span>
              <Medal /> {tab + 1}위 추천 시간표
            </span>
            <h2>
              {tab === 0
                ? "균형이 완벽한 시간표"
                : tab === 1
                  ? "효율을 높인 시간표"
                  : "여유를 살린 시간표"}
            </h2>
            <strong>
              {r.score}
              <small>/100</small>
            </strong>
          </div>
          <Table list={r.courses} />
        </section>
        <aside className="summary">
          <section>
            <h3>시간표 요약</h3>
            <div>
              {[
                [GraduationCap, r.credits, "학점", "총 학점"],
                [CalendarDays, r.days, "일", "등교일"],
                [Clock3, min(r.gapMinutes), "", "총 공강"],
                [Footprints, travelTime(r.moveMinutes), "", "이동시간"],
              ].map(([Icon, val, unit, label]: any) => (
                <article>
                  <Icon />
                  <span>
                    <b>{val}</b>
                    {unit}
                    <small>{label}</small>
                  </span>
                </article>
              ))}
            </div>
            <p className="move-data-note">
              강의실 코드 기준 건물 간 이동시간을 합산했어요.
            </p>
          </section>
          <MoveDetails result={r} />
          <section className="included">
            <h3>
              🟢 포함된 강의 <b>{r.courses.length}</b>
            </h3>
            {r.courses.map((c) => (
              <div>
                <i style={{ background: c.color }} />
                <span>
                  <b>{c.name}</b>
                  <small>
                    {c.professor} · {c.credits}학점
                  </small>
                </span>
              </div>
            ))}
          </section>
          <section className="excluded">
            <h3>
              ⚪ 제외된 후보 강의 <b>{r.excluded.length}</b>
            </h3>
            <p>
              {r.excluded.length
                ? r.excluded.map((c) => c.name).join(", ")
                : "모든 후보 강의가 포함됐어요!"}
            </p>
          </section>
        </aside>
      </div>
      <div className="actions">
        <button className="secondary" onClick={back}>
          <ArrowLeft /> 조건 수정
        </button>
        <div className="result-actions">
          <button
            className="secondary save-image"
            onClick={() => saveScheduleImage(r, tab + 1)}
          >
            <Download /> 이미지로 저장
          </button>
          <button className="primary" onClick={() => useInStuff(r.courses)}>
            <Zap /> 쑤셔넣기에 가져가기
          </button>
        </div>
      </div>
    </main>
  );
}
function ModeSelect({ choose }: { choose: (mode: ServiceMode) => void }) {
  return (
    <main className="mode-page">
      <div className="mode-title">
        <mark>
          <Sparkles /> 나에게 맞는 방식 선택
        </mark>
        <h1>어떤 시간표가 필요하세요?</h1>
        <p>
          처음부터 골라 만들거나, 이미 만든 시간표의 빈칸을 알차게 채워보세요.
        </p>
      </div>
      <div className="mode-cards">
        <button onClick={() => choose("pick")}>
          <i className="pick">
            <BookOpen />
          </i>
          <em>처음부터 만들기</em>
          <h2>골라담는 시간표</h2>
          <p>
            듣고 싶은 후보 강의를 직접 고르고
            <br />
            조건에 맞는 최적의 조합을 추천받아요.
          </p>
          <span>
            강의 골라담기 <ArrowRight />
          </span>
        </button>
        <button onClick={() => choose("stuff")}>
          <i className="stuff">
            <Zap />
          </i>
          <em>공강 채우기</em>
          <h2>쑤셔넣는 시간표</h2>
          <p>
            현재 수강신청한 과목을 알려주면
            <br />
            남은 공강에 들어갈 강의를 찾아드려요.
          </p>
          <span>
            빈칸 쑤셔넣기 <ArrowRight />
          </span>
        </button>
      </div>
      <small className="mode-note">
        <Info /> 두 모드 모두 2026학년도 2학기 실제 강의 목록을 사용해요.
      </small>
    </main>
  );
}
function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 500);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <button
      type="button"
      className={`back-to-top ${visible ? "show" : ""}`}
      aria-label="맨 위로 이동"
      title="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp />
    </button>
  );
}
function StuffResults({
  ids,
  back,
  home,
}: {
  ids: Set<string>;
  back: () => void;
  home: () => void;
}) {
  const [q, setQ] = useState(""),
    [dayFilter, setDayFilter] = useState<"전체" | Day>("전체"),
    [addedIds, setAddedIds] = useState(new Set<string>()),
    current = useMemo(() => courses.filter((c) => ids.has(c.id)), [ids]),
    added = useMemo(
      () => courses.filter((c) => addedIds.has(c.id)),
      [addedIds],
    ),
    stuffTravel = useMemo(
      () => calculateConsecutiveTravel([...current, ...added]),
      [current, added],
    );
  const available = useMemo(
      () =>
        courses
          .filter(
            (c) => !ids.has(c.id) && current.every((x) => !coursesClash(x, c)),
          )
          .sort((a, b) => a.name.localeCompare(b.name, "ko")),
      [ids, current],
    ),
    visible = available
      .filter(
        (c) =>
          (dayFilter === "전체" ||
            c.meetings.some((meeting) => meeting.day === dayFilter)) &&
          (c.name.includes(q) ||
            c.professor.includes(q) ||
            c.code.toLowerCase().includes(q.toLowerCase())),
      )
      .slice(0, 120),
    credits = current.reduce((s, c) => s + c.credits, 0),
    addedCredits = added.reduce((s, c) => s + c.credits, 0),
    toggleAdded = (course: Course) => {
      const next = new Set(addedIds);
      if (next.has(course.id)) next.delete(course.id);
      else if (added.every((selected) => !coursesClash(selected, course)))
        next.add(course.id);
      setAddedIds(next);
    };
  return (
    <main>
      <div className="result-head stuff-head">
        <div>
          <mark>
            <Zap /> 빈칸 탐색 완료
          </mark>
          <h1>공강에 쑤셔넣을 수 있는 강의예요</h1>
          <p>
            아래 강의를 선택하면 시간표에 바로 채워져요. 겹치는 과목은 선택할 수 없어요.
          </p>
        </div>
        <div className="stuff-result-actions">
          <button className="secondary" onClick={back}>
            <ArrowLeft /> 이전으로
          </button>
          <button className="secondary" onClick={home}>
            모드 다시 선택
          </button>
        </div>
      </div>
      <div className="stuff-workspace">
      <section className="stuff-preview">
        <div className="stuff-preview-head">
          <span>
            <b>현재 {credits}학점</b>
            {added.length > 0 && (
              <>
                {" "}
                → <strong>{credits + addedCredits}학점</strong>
                <em> · 추가 {added.length}과목</em>
              </>
            )}
          </span>
          <div className="stuff-head-actions">
            <button
              className="secondary save-image"
              onClick={() => saveStuffedScheduleImage(current, added)}
            >
              <Download /> 이미지로 저장
            </button>
            <button className="secondary" onClick={back}>
              <ArrowLeft /> 현재 강의 수정
            </button>
          </div>
        </div>
        <Table list={[...current, ...added]} />
        {added.length > 0 && <div className="stuff-added-list">{added.map(course=><button key={course.id} onClick={()=>toggleAdded(course)}><i style={{background:course.color}}/><span><b>{course.name}</b><small>{courseTime(course)}</small></span><X/></button>)}</div>}
        {stuffTravel.moveDetails.length > 0 && (
          <div className="stuff-travel">
            <MoveDetails result={stuffTravel} />
          </div>
        )}
      </section>
      <section className="stuff-catalog">
      <div className="tools stuff-tools">
        <label>
          <Search />
          <input
            placeholder="추가할 강의 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="day-filter">
          {(["전체", ...days] as ("전체" | Day)[]).map((x) => (
            <button
              key={x}
              className={dayFilter === x ? "on" : ""}
              onClick={() => setDayFilter(x)}
            >
              {x === "전체" ? x : `${x}요일`}
            </button>
          ))}
        </div>
        <small>
          <b>{available.length}</b>개 추가 가능
        </small>
      </div>
      <div className="stuff-recommend-grid">
        {visible.map((course) => {
          const selected=addedIds.has(course.id),conflict=!selected&&added.some(other=>coursesClash(other,course));
          return <div className="stuff-card" key={course.id}>
              <CourseCard c={course} on={selected} click={()=>toggleAdded(course)} selectedText="시간표에 추가됨" disabled={conflict} disabledText="선택한 과목과 시간 겹침"/>
            </div>
        })}
      </div>
      </section>
      </div>
    </main>
  );
}
export default function App() {
  const [mode, setMode] = useState<ServiceMode | null>(null),
    [step, setStep] = useState(1),
    [ids, setIds] = useState(new Set<string>()),
    [required, setRequired] = useState(new Set<string>()),
    [blocked, setBlocked] = useState(new Set<string>()),
    [enabled, setEnabled] = useState(
      new Set<GlobalCondition>(["credits"]),
    ),
    [rs, setRs] = useState<ScheduleResult[]>([]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [mode, step]);
  const generate = () => {
      setRs(
        optimize(
          courses.filter((c) => ids.has(c.id)),
          required,
          blocked,
          enabled,
        ),
      );
      setStep(3);
    },
    clear = () => {
      setStep(1);
      setIds(new Set());
      setRequired(new Set());
      setBlocked(new Set());
      setEnabled(new Set<GlobalCondition>(["credits"]));
      setRs([]);
    },
    home = () => {
      clear();
      setMode(null);
    },
    choose = (next: ServiceMode) => {
      clear();
      setMode(next);
    },
    switchMode = (next: ServiceMode) => {
      if (next === mode) return;
      if (
        (ids.size > 0 || step > 1) &&
        !window.confirm(
          "다른 모드로 전환하면 현재 선택한 강의와 설정이 초기화돼요. 전환할까요?",
        )
      )
        return;
      choose(next);
    },
    useScheduleInStuff = (selected: Course[]) => {
      setIds(new Set(selected.map((course) => course.id)));
      setRequired(new Set());
      setBlocked(new Set());
      setRs([]);
      setMode("stuff");
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  return (
    <>
      <Header step={step} mode={mode} onModeChange={switchMode} />
      {!mode && <ModeSelect choose={choose} />}{" "}
      {mode && step === 1 && <DataNotice />}
      {mode && step === 1 && (
        <Select mode={mode} ids={ids} setIds={setIds} next={() => setStep(2)} />
      )}{" "}
      {mode === "pick" && step === 2 && (
        <Settings
          ids={ids}
          required={required}
          setRequired={setRequired}
          blocked={blocked}
          setBlocked={setBlocked}
          enabled={enabled}
          setEnabled={setEnabled}
          back={() => setStep(1)}
          next={generate}
        />
      )}{" "}
      {mode === "pick" && step === 3 && <Loading done={() => setStep(4)} />}{" "}
      {mode === "pick" && step === 4 && (
        <Results
          rs={rs}
          back={() => setStep(2)}
          reset={home}
          useInStuff={useScheduleInStuff}
        />
      )}{" "}
      {mode === "stuff" && step === 2 && (
        <StuffResults ids={ids} back={() => setStep(1)} home={home} />
      )}
      <BackToTop />
      <footer className="site-footer">
        © 2026 {mode === "stuff" ? "쑤셔넣는" : "골라담는"} 시간표{" "}
        <span>더 나은 캠퍼스 라이프를 위해</span>
      </footer>
    </>
  );
}
