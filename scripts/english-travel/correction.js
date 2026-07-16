const CONTRACTIONS = new Map([
  ["i'm", "i am"],
  ["i'd", "i would"],
  ["i'll", "i will"],
  ["can't", "cannot"],
  ["cannot", "cannot"],
  ["don't", "do not"],
  ["doesn't", "does not"],
  ["isn't", "is not"],
  ["it's", "it is"],
  ["what's", "what is"],
  ["that's", "that is"],
  ["we'll", "we will"],
  ["we're", "we are"],
  ["you're", "you are"],
  ["there's", "there is"],
]);

const FILLERS = new Set(["um", "uh", "er", "ah", "please"]);

function cleanApostrophes(value) {
  return String(value || "")
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-");
}

export function normalizeSentence(value) {
  let sentence = cleanApostrophes(value).toLowerCase().trim();
  for (const [short, long] of CONTRACTIONS) {
    sentence = sentence.replace(new RegExp(`\\b${short.replace("'", "\\'")}\\b`, "g"), long);
  }
  return sentence
    .replace(/t\s*-\s*shirt/g, "tshirt")
    .replace(/round\s*-\s*trip/g, "round trip")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value, dropFillers = false) {
  const list = normalizeSentence(value).split(" ").filter(Boolean);
  return dropFillers ? list.filter((token) => !FILLERS.has(token)) : list;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function characterSimilarity(a, b) {
  const first = normalizeSentence(a);
  const second = normalizeSentence(b);
  const longest = Math.max(first.length, second.length);
  if (!longest) return 1;
  return Math.max(0, 1 - levenshtein(first, second) / longest);
}

function tokenF1(a, b) {
  const first = tokens(a, true);
  const second = tokens(b, true);
  if (!first.length || !second.length) return 0;
  const remaining = [...second];
  let matches = 0;
  first.forEach((token) => {
    let index = remaining.indexOf(token);
    if (index < 0) {
      index = remaining.findIndex((candidate) => characterSimilarity(token, candidate) >= 0.78);
    }
    if (index >= 0) {
      matches += 1;
      remaining.splice(index, 1);
    }
  });
  const precision = matches / first.length;
  const recall = matches / second.length;
  return precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
}

function orderedSimilarity(a, b) {
  const first = tokens(a, true);
  const second = tokens(b, true);
  if (!first.length || !second.length) return 0;
  const rows = Array.from({ length: first.length + 1 }, () => new Uint16Array(second.length + 1));
  for (let i = 1; i <= first.length; i += 1) {
    for (let j = 1; j <= second.length; j += 1) {
      rows[i][j] = first[i - 1] === second[j - 1]
        ? rows[i - 1][j - 1] + 1
        : Math.max(rows[i - 1][j], rows[i][j - 1]);
    }
  }
  return rows[first.length][second.length] / Math.max(first.length, second.length);
}

function sentenceSimilarity(a, b) {
  return (
    characterSimilarity(a, b) * 0.5 +
    tokenF1(a, b) * 0.32 +
    orderedSimilarity(a, b) * 0.18
  );
}

function includesFuzzyToken(answerTokens, keyword) {
  const normalizedKeyword = normalizeSentence(keyword);
  if (!normalizedKeyword) return false;
  if (normalizedKeyword.includes(" ")) {
    return normalizeSentence(answerTokens.join(" ")).includes(normalizedKeyword);
  }
  return answerTokens.some(
    (token) => token === normalizedKeyword || (normalizedKeyword.length > 4 && characterSimilarity(token, normalizedKeyword) >= 0.78),
  );
}

function keywordScore(answer, keywords = []) {
  if (!keywords.length) return 0;
  const answerTokens = tokens(answer);
  const found = keywords.filter((keyword) => includesFuzzyToken(answerTokens, keyword)).length;
  return found / keywords.length;
}

function detectFriendlyTip(answer, target, fallback) {
  const normalized = normalizeSentence(answer);
  const targetNormalized = normalizeSentence(target);

  if (/\bi like\b/.test(normalized) && /\bi would like\b/.test(targetNormalized)) {
    return "지금 주문하거나 부탁할 때는 I like보다 I'd like를 쓰면 더 자연스러워요.";
  }
  if (/\bdoes\s+\w+\s+has\b/.test(normalized)) {
    return "does가 앞에 오면 뒤의 동사는 원래 모양 have를 써요.";
  }
  if (/\b(two|three|four|five|six|seven|eight|nine|ten)\s+(day|night|ticket|picture)\b/.test(normalized)) {
    return "두 개 이상을 말할 때는 명사 뒤에 s를 붙여 주세요.";
  }
  if (/\bi\s+(lost|from|allergic)\b/.test(normalized) && !/\bi am\b/.test(normalized)) {
    return "I 다음에 상태를 말할 때는 am을 넣어 문장을 완성해요.";
  }
  if (/\bhow much it is\b/.test(normalized)) {
    return "질문에서는 is를 앞으로 보내 How much is it?이라고 해요.";
  }
  return fallback || null;
}

/**
 * Meaning-first feedback for a child learner. A small grammar mistake never costs
 * points when the intended travel meaning is clear.
 */
export function evaluateSentence(answer, turn, options = {}) {
  const spoken = String(answer || "").trim();
  const confidence = Number.isFinite(options.confidence) ? options.confidence : null;
  const candidates = [...new Set([turn.target, ...(turn.accepts || [])].filter(Boolean))];

  if (!spoken) {
    return {
      status: "retry",
      score: 0,
      canAdvance: false,
      corrected: turn.target,
      explanationKo: "아직 문장이 들리지 않았어요. 천천히 한 번 더 말해 보세요.",
    };
  }

  const exact = candidates.some((candidate) => normalizeSentence(candidate) === normalizeSentence(spoken));
  const similarity = Math.max(...candidates.map((candidate) => sentenceSimilarity(spoken, candidate)));
  const intent = keywordScore(spoken, turn.keywords || []);
  const grammarTip = detectFriendlyTip(spoken, turn.target, null);
  const shortIntent = (turn.keywords || []).length === 1 && intent === 1;
  const enoughWords = tokens(spoken, true).length >= Math.min(2, tokens(turn.target, true).length);
  const meaningClear = exact || similarity >= 0.71 || (intent >= 0.67 && enoughWords) || shortIntent;
  const polished = exact || (similarity >= 0.9 && !grammarTip);
  const lowAudioConfidence = confidence !== null && confidence > 0 && confidence < 0.42;

  if (lowAudioConfidence && !meaningClear) {
    return {
      status: "uncertain",
      score: Math.max(similarity, intent),
      canAdvance: false,
      corrected: turn.target,
      explanationKo: "마이크가 문장을 또렷하게 듣지 못했어요. 틀린 것으로 처리하지 않았으니 가까이에서 천천히 다시 말해 보세요.",
    };
  }

  if (polished) {
    return {
      status: "great",
      score: Math.max(similarity, intent),
      canAdvance: true,
      corrected: turn.target,
      explanationKo: "아주 자연스러워요! 여행지에서도 그대로 말할 수 있어요.",
    };
  }

  if (meaningClear) {
    return {
      status: "polish",
      score: Math.max(similarity, intent),
      canAdvance: true,
      corrected: turn.target,
      explanationKo: grammarTip || turn.correctionKo || "뜻은 잘 전해졌어요. 아래 문장처럼 말하면 더 자연스러워요.",
    };
  }

  return {
    status: "retry",
    score: Math.max(similarity, intent),
    canAdvance: false,
    corrected: turn.target,
    explanationKo: turn.correctionKo || "괜찮아요. 핵심 표현을 보고 천천히 다시 말해 보세요.",
  };
}
