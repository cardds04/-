const test = require("node:test");
const assert = require("node:assert/strict");

const {
  audioModelFormat,
  buildAudioUnderstandingPrompt,
  buildTranscriptionPrompt,
  decodeAudioDataUri,
  handleEnglishTravelSpeech,
  normalizeAudioUnderstanding,
  transcriptionConfidence,
} = require("../lib/english-travel-speech-logic.cjs");
const {
  findMission,
  handleEnglishTravelDialogue,
  normalizeMissionAssessment,
  repeatedReplyStreak,
} = require("../lib/english-travel-dialogue-logic.cjs");

function audioDataUri(size = 900, mime = "audio/wav") {
  return `data:${mime};base64,${Buffer.alloc(size, 7).toString("base64")}`;
}

function modelClaim(id, evidence) {
  return {
    understood: true,
    relevant: true,
    languageQuality: "understandable",
    safety: "safe",
    newlyCompletedGoals: [{ id, evidence }],
    revokedGoalIds: [],
    correctedReply: evidence,
    feedbackKo: "잘했어요.",
    npcReplyEn: "I understand.",
    npcReplyKo: "알겠습니다.",
    followUpEn: "Could you tell me more?",
    followUpKo: "조금 더 말해 주세요.",
  };
}

function acceptedGoals(missionId, reply, goalId, evidence = reply, alternatives = []) {
  const mission = findMission(missionId);
  return normalizeMissionAssessment(modelClaim(goalId, evidence), mission, {
    reply,
    alternatives,
    speechConfidence: 0.85,
    completedGoalIds: [],
  }).completedGoalIds;
}

function audioToolResponse(report) {
  return new Response(JSON.stringify({
    model: "gpt-audio-1.5",
    choices: [{
      finish_reason: "stop",
      message: {
        tool_calls: [{
          type: "function",
          function: { name: "report_learner_turn", arguments: JSON.stringify(report) },
        }],
      },
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function clearAudioReport(overrides = {}) {
  return {
    literalTranscript: "I am flying to Sunny City. I have one bag.",
    interpretedTranscript: "I am flying to Sunny City. I have one bag.",
    meaningSummary: "The learner is going to Sunny City with one bag.",
    semanticConfidence: 0.96,
    criticalFacts: [
      { type: "destination", value: "Sunny City", acousticConfidence: 0.94, alternatives: [] },
      { type: "quantity", value: "one bag", acousticConfidence: 0.97, alternatives: [] },
    ],
    needsConfirmation: false,
    confirmationQuestionEn: "",
    confirmationQuestionKo: "",
    ...overrides,
  };
}

test("audio prompts use the latest NPC line and accent context without supplying the expected answer", () => {
  const mission = findMission("journey-01");
  const transcriptionPrompt = buildTranscriptionPrompt(mission, "Could you repeat the number of bags?");
  const understandingPrompt = buildAudioUnderstandingPrompt({
    mission,
    currentNpcLine: "Could you repeat the number of bags?",
    history: [],
  });
  assert.match(transcriptionPrompt, /Korean-accented English/i);
  assert.match(transcriptionPrompt, /repeat the number of bags/i);
  assert.match(understandingPrompt, /ORIGINAL learner audio/i);
  assert.match(understandingPrompt, /whole utterance/i);
  assert.doesNotMatch(understandingPrompt, /exactly one bag/i);
  assert.doesNotMatch(understandingPrompt, /boarding pass, please/i);
});

test("token log probabilities remain a bounded fallback confidence", () => {
  const confidence = transcriptionConfidence([
    { token: "I", logprob: -0.1 },
    { token: " bag", logprob: -0.3 },
    { token: ".", logprob: -5 },
  ]);
  assert.ok(confidence > 0.8 && confidence < 1);
  assert.equal(transcriptionConfidence([]), null);
});

test("audio decoder and native audio format selection are strict", () => {
  const decoded = decodeAudioDataUri(audioDataUri(900, "audio/webm"), "audio/webm;codecs=opus");
  assert.equal(decoded.mime, "audio/webm");
  assert.equal(decoded.buffer.length, 900);
  assert.equal(audioModelFormat("audio/wav"), "wav");
  assert.equal(audioModelFormat("audio/mp3"), "mp3");
  assert.equal(audioModelFormat("audio/webm"), "");
  assert.throws(() => decodeAudioDataUri(audioDataUri(900, "audio/webm"), "audio/mp4"), /unsupported_audio/);
});

test("native audio AI listens once and sends its interpreted sentence to mission evaluation", async () => {
  let audioCalls = 0;
  let dialogueInput;
  let trustedUnderstanding;
  const output = await handleEnglishTravelSpeech({
    audio: audioDataUri(),
    mime: "audio/wav",
    missionId: "journey-01",
    locationId: "airport",
    currentNpcLine: "Where are you flying today?",
    history: [],
  }, {
    openAiKey: "test-key",
    audioFetchImpl: async (url, request) => {
      audioCalls += 1;
      assert.equal(url, "https://api.openai.com/v1/chat/completions");
      const body = JSON.parse(request.body);
      assert.equal(body.model, "gpt-audio-1.5");
      assert.deepEqual(body.modalities, ["text"]);
      assert.equal(body.tool_choice.function.name, "report_learner_turn");
      assert.equal(body.messages[1].content[1].type, "input_audio");
      assert.equal(body.messages[1].content[1].input_audio.format, "wav");
      return audioToolResponse(clearAudioReport({
        literalTranscript: "I have one back.",
        interpretedTranscript: "I have one bag.",
        meaningSummary: "The learner has one bag.",
        criticalFacts: [{ type: "quantity", value: "one bag", acousticConfidence: 0.96, alternatives: ["one bag", "one back"] }],
      }));
    },
    dialogueHandler: async (input, options) => {
      dialogueInput = input;
      trustedUnderstanding = options.trustedAudioUnderstanding;
      return { status: 200, json: { ok: true, corrected: input.reply, missionStateToken: "signed", completedGoalIds: ["baggage_count"] } };
    },
  });
  assert.equal(audioCalls, 1);
  assert.equal(dialogueInput.reply, "I have one bag.");
  assert.deepEqual(dialogueInput.alternatives, []);
  assert.equal(trustedUnderstanding.literalTranscript, "I have one back.");
  assert.equal(output.status, 200);
  assert.equal(output.json.heardText, "I have one bag.");
  assert.equal(output.json.literalHeardText, "I have one back.");
  assert.equal(output.json.transcriptionSource, "native-audio-understanding");
  assert.equal("audio" in output.json, false);
});

test("unsupported direct-audio formats use the transcription fallback without word replacement", async () => {
  let transcriptionCalls = 0;
  let dialogueInput;
  const output = await handleEnglishTravelSpeech({
    audio: audioDataUri(900, "audio/webm"),
    mime: "audio/webm",
    missionId: "journey-01",
    locationId: "airport",
    currentNpcLine: "Could you repeat the number of bags?",
  }, {
    openAiKey: "test-key",
    audioFetchImpl: async () => { throw new Error("native audio should not receive WebM"); },
    transcriptionFetchImpl: async (_url, request) => {
      transcriptionCalls += 1;
      assert.equal(request.body.get("model"), "gpt-4o-transcribe");
      assert.match(request.body.get("prompt"), /repeat the number of bags/i);
      return new Response(JSON.stringify({
        text: "I have one back.",
        logprobs: [{ token: " back", logprob: -0.2 }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
    dialogueHandler: async (input) => {
      dialogueInput = input;
      return { status: 200, json: { ok: true, corrected: input.reply, completedGoalIds: [] } };
    },
  });
  assert.equal(transcriptionCalls, 1);
  assert.equal(dialogueInput.reply, "I have one back.");
  assert.deepEqual(dialogueInput.alternatives, []);
  assert.equal(output.json.heardText, "I have one back.");
  assert.equal(output.json.transcriptionSource, "transcription-fallback");
});

test("critical ambiguity produces one short specific confirmation", () => {
  const understanding = normalizeAudioUnderstanding(clearAudioReport({
    literalTranscript: "I have two bags.",
    interpretedTranscript: "I have one bag.",
    semanticConfidence: 0.8,
    criticalFacts: [{ type: "quantity", value: "one or two bags", acousticConfidence: 0.62, alternatives: ["one bag", "two bags"] }],
    needsConfirmation: false,
    confirmationQuestionEn: "Did you say one bag?",
    confirmationQuestionKo: "가방이 한 개라고 말했나요?",
  }));
  assert.equal(understanding.needsConfirmation, true);
  assert.equal(understanding.confirmationKind, "specific");
  assert.equal(understanding.confirmationQuestionEn, "Did you say one bag?");
});

test("a clear accent-related item interpretation does not require confirmation", () => {
  const understanding = normalizeAudioUnderstanding(clearAudioReport({
    literalTranscript: "I have one back.",
    interpretedTranscript: "I have one bag.",
    criticalFacts: [{ type: "item", value: "bag", acousticConfidence: 0.95, alternatives: ["bag", "back"] }],
  }));
  assert.equal(understanding.needsConfirmation, false);
  assert.equal(understanding.interpretedTranscript, "I have one bag.");
});

test("the dialogue engine speaks only the AI's specific confirmation and preserves mission state", async () => {
  const result = await handleEnglishTravelDialogue({
    v: 2,
    mode: "mission",
    missionId: "journey-01",
    locationId: "airport",
    reply: "I have one bag.",
    alternatives: [],
    history: [],
  }, {
    missionStateSecret: "test-secret",
    trustedAudioUnderstanding: {
      needsConfirmation: true,
      confirmationKind: "specific",
      confirmationQuestionEn: "Did you say one bag?",
      confirmationQuestionKo: "가방이 한 개라고 말했나요?",
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.json.decision, "clarify");
  assert.equal(result.json.clarificationKind, "specific");
  assert.equal(result.json.npcReplyEn, "Did you say one bag?");
  assert.equal(result.json.followUpEn, "");
  assert.deepEqual(result.json.completedGoalIds, []);
});

test("when no useful meaning is heard the dialogue uses only the brief retry sentence", async () => {
  const result = await handleEnglishTravelDialogue({
    v: 2,
    mode: "mission",
    missionId: "journey-01",
    locationId: "airport",
    reply: "Unclear audio",
    alternatives: [],
    history: [],
  }, {
    missionStateSecret: "test-secret",
    trustedAudioUnderstanding: {
      needsConfirmation: true,
      confirmationKind: "generic",
      confirmationQuestionEn: "Sorry, could you say that again?",
      confirmationQuestionKo: "미안해요. 다시 말해 줄래요?",
    },
  });
  assert.equal(result.json.npcReplyEn, "Sorry, could you say that again?");
  assert.equal(result.json.followUpEn, "");
});

test("natural singular and pair expressions satisfy quantity goals", () => {
  assert.deepEqual(acceptedGoals("journey-01", "I'm headed to Sunny City with my only bag.", "baggage_count"), ["baggage_count"]);
  assert.deepEqual(acceptedGoals("journey-01", "Sunny City, please. Just this suitcase.", "baggage_count"), ["baggage_count"]);
  assert.deepEqual(acceptedGoals("journey-10", "Could you send up a pair of towels, please?", "quantity_two"), ["quantity_two"]);
});

test("natural handover language is accepted for travel documents", () => {
  assert.deepEqual(acceptedGoals("journey-01", "There you are.", "boarding_pass"), ["boarding_pass"]);
  assert.deepEqual(acceptedGoals("journey-02", "There you are.", "passport"), ["passport"]);
});

test("critical quantities, negation, and self-corrections are preserved", () => {
  assert.deepEqual(acceptedGoals("journey-01", "Not one, I have two bags.", "baggage_count"), []);
  assert.deepEqual(acceptedGoals("journey-01", "Two bags, sorry, one bag.", "baggage_count"), ["baggage_count"]);
  assert.deepEqual(acceptedGoals("journey-01", "One bag, no, make that two.", "baggage_count"), []);
  assert.deepEqual(acceptedGoals("journey-02", "I haven't taken my laptop out.", "electronics_out"), []);
});

test("conflicting speech alternatives can never change a critical quantity", () => {
  assert.deepEqual(
    acceptedGoals("journey-01", "I have two bags.", "baggage_count", "I have one bag.", ["I have one bag."]),
    [],
  );
});

test("AI coaching cannot rewrite the child's number into the expected mission answer", () => {
  const mission = findMission("journey-01");
  const raw = modelClaim("baggage_count", "I have two bags.");
  raw.newlyCompletedGoals = [];
  raw.correctedReply = "I have one bag.";
  const result = normalizeMissionAssessment(raw, mission, {
    reply: "I have two bags.",
    alternatives: [],
    speechConfidence: 0.94,
    completedGoalIds: [],
  });
  assert.equal(result.corrected, "I have two bags.");
  assert.match(result.explanationKo, /숫자와 뜻은 바꾸지 않았어요/);
});

test("negative goal meaning remains valid only for the mission that requires it", () => {
  assert.deepEqual(acceptedGoals("journey-10", "I do not want towels.", "towels"), []);
  assert.deepEqual(acceptedGoals("journey-22", "I didn't use anything from the minibar.", "minibar_none"), ["minibar_none"]);
});

test("a meaning-preserving correction lets a mangled transcript complete the goal", () => {
  const mission = findMission("journey-01");
  const raw = modelClaim("baggage_count", "one bag");
  raw.correctedReply = "I have one bag.";
  const result = normalizeMissionAssessment(raw, mission, {
    reply: "I have one back.",
    alternatives: [],
    speechConfidence: 0.8,
    completedGoalIds: [],
  });
  assert.deepEqual(result.completedGoalIds, ["baggage_count"]);
});

test("a correction that changes the spoken number still cannot complete the goal", () => {
  const mission = findMission("journey-01");
  const raw = modelClaim("baggage_count", "one bag");
  raw.correctedReply = "I have one bag.";
  const result = normalizeMissionAssessment(raw, mission, {
    reply: "I have two bags.",
    alternatives: [],
    speechConfidence: 0.8,
    completedGoalIds: [],
  });
  assert.deepEqual(result.completedGoalIds, []);
});

test("a bare yes after a confirmation question adopts the confirmed sentence without re-asking", () => {
  const understanding = normalizeAudioUnderstanding({
    literalTranscript: "Yes.",
    interpretedTranscript: "I have one bag.",
    meaningSummary: "The learner confirms one bag.",
    semanticConfidence: 0.9,
    criticalFacts: [{ type: "quantity", value: "one bag", acousticConfidence: 0.7, alternatives: [] }],
    needsConfirmation: false,
    confirmationQuestionEn: "",
    confirmationQuestionKo: "",
  }, { confirmedSentence: "I have one bag." });
  assert.equal(understanding.needsConfirmation, false);
  assert.equal(understanding.interpretedTranscript, "I have one bag.");
});

test("repeated near-identical attempts are counted from the dialogue history", () => {
  assert.equal(repeatedReplyStreak("I have one bag.", [
    { npc: "How many bags?", learner: "I have one back." },
    { npc: "Sorry, could you say that again?", learner: "I have one bak." },
  ]), 2);
  assert.equal(repeatedReplyStreak("I have one bag.", [
    { npc: "How many bags?", learner: "Sunny City, please." },
    { npc: "Pardon?", learner: "I have one bag." },
  ]), 1);
  assert.equal(repeatedReplyStreak("I have one bag.", [
    { npc: "Where are you flying?", learner: "Sunny City, please." },
  ]), 0);
});

test("the third identical attempt trusts the model's semantic claim without the strict validator", () => {
  const mission = findMission("journey-01");
  const raw = modelClaim("boarding_pass", "give me the paper");
  const strict = normalizeMissionAssessment(raw, mission, {
    reply: "Give me the paper, please.",
    alternatives: [],
    speechConfidence: 0.6,
    completedGoalIds: [],
    repeatStreak: 1,
  });
  assert.deepEqual(strict.completedGoalIds, []);
  const lenient = normalizeMissionAssessment(raw, mission, {
    reply: "Give me the paper, please.",
    alternatives: [],
    speechConfidence: 0.6,
    completedGoalIds: [],
    repeatStreak: 2,
  });
  assert.deepEqual(lenient.completedGoalIds, ["boarding_pass"]);
});

test("after three failed repeats the NPC lets the traveler through", () => {
  const mission = findMission("journey-01");
  const raw = {
    understood: false,
    relevant: false,
    languageQuality: "needs_clarification",
    safety: "safe",
    newlyCompletedGoals: [],
    revokedGoalIds: [],
    correctedReply: "",
    feedbackKo: "",
    npcReplyEn: "Sorry, could you say that again?",
    npcReplyKo: "",
    followUpEn: "",
    followUpKo: "",
  };
  const result = normalizeMissionAssessment(raw, mission, {
    reply: "flurble wam took",
    alternatives: [],
    speechConfidence: 0.4,
    completedGoalIds: [],
    repeatStreak: 2,
  });
  assert.equal(result.decision, "progress");
  assert.deepEqual(result.newlyCompletedGoalIds, ["destination_city"]);
  assert.doesNotMatch(result.npcReplyEn, /say that again/i);
  assert.match(result.explanationKo, /통과할게요/);
});

test("a repeated sentence skips the confirmation loop and goes straight to evaluation", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  let geminiCalls = 0;
  try {
    const result = await handleEnglishTravelDialogue({
      v: 2,
      mode: "mission",
      missionId: "journey-01",
      locationId: "airport",
      reply: "I have one bag.",
      alternatives: [],
      history: [{ npc: "Did you say one bag?", learner: "I have one back." }],
    }, {
      missionStateSecret: "test-secret",
      trustedAudioUnderstanding: {
        needsConfirmation: true,
        confirmationKind: "specific",
        confirmationQuestionEn: "Did you say one bag?",
        confirmationQuestionKo: "가방이 한 개라고 말했나요?",
      },
      fetchImpl: async () => {
        geminiCalls += 1;
        return new Response(JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  understood: true,
                  relevant: true,
                  languageQuality: "natural",
                  safety: "safe",
                  newlyCompletedGoals: [{ id: "baggage_count", evidence: "one bag" }],
                  revokedGoalIds: [],
                  correctedReply: "I have one bag.",
                  feedbackKo: "좋아요!",
                  npcReplyEn: "One bag, perfect.",
                  npcReplyKo: "가방 하나, 좋아요.",
                  followUpEn: "Where are you flying today?",
                  followUpKo: "오늘 어디로 가시나요?",
                }),
              }],
            },
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      },
    });
    assert.equal(geminiCalls, 1);
    assert.equal(result.json.decision, "progress");
    assert.deepEqual(result.json.newlyCompletedGoalIds, ["baggage_count"]);
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

test("clarification wording varies between repeated attempts", async () => {
  const clarifyInput = (attemptCount) => handleEnglishTravelDialogue({
    v: 2,
    mode: "mission",
    missionId: "journey-01",
    locationId: "airport",
    reply: "Unclear audio",
    alternatives: [],
    history: [],
    attemptCount,
  }, {
    missionStateSecret: "test-secret",
    trustedAudioUnderstanding: {
      needsConfirmation: true,
      confirmationKind: "generic",
      confirmationQuestionEn: "",
      confirmationQuestionKo: "",
    },
  });
  const first = await clarifyInput(0);
  const second = await clarifyInput(1);
  assert.equal(first.json.npcReplyEn, "Sorry, could you say that again?");
  assert.notEqual(second.json.npcReplyEn, first.json.npcReplyEn);
  assert.equal(second.json.followUpEn, "");
});
