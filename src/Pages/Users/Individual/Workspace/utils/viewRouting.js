export const VIEW_TO_PATH = {
	roadmap: "roadmap",
	quiz: "quiz",
	communityQuiz: "quiz/community",
	flashcard: "flashcard",
	mockTest: "mock-test",
	postLearning: "post-learning",
	createQuiz: "quiz/create",
	createFlashcard: "flashcard/create",
	createMockTest: "mock-test/create",
	createPostLearning: "post-learning/create",
};

const PATH_TO_VIEW = Object.entries(VIEW_TO_PATH).reduce((result, [view, path]) => {
	result[path] = view;
	return result;
}, {});

export function resolveWorkspaceViewFromSubPath(subPath) {
	if (!subPath) return { view: null, quizId: null, backTarget: null };

	const roadmapPathMatch = subPath.match(/^roadmap\/(\d+)(?:\/phase\/(\d+))?$/);
	if (roadmapPathMatch) {
		return {
			view: "roadmap",
			quizId: null,
			backTarget: null,
			roadmapId: Number(roadmapPathMatch[1]),
			phaseId: roadmapPathMatch[2] ? Number(roadmapPathMatch[2]) : null,
		};
	}

	const directView = PATH_TO_VIEW[subPath];
	if (directView) {
		return { view: directView, quizId: null, backTarget: null };
	}

	const roadmapQuizEditMatch = subPath.match(/^roadmap\/(\d+)\/phase\/(\d+)\/quiz\/(\d+)\/edit$/);
	if (roadmapQuizEditMatch) {
		return {
			view: "editQuiz",
			quizId: Number(roadmapQuizEditMatch[3]),
			backTarget: {
				view: "roadmap",
				roadmapId: Number(roadmapQuizEditMatch[1]),
				phaseId: Number(roadmapQuizEditMatch[2]),
			},
		};
	}

	const legacyRoadmapQuizEditMatch = subPath.match(/^roadmap\/quiz\/(\d+)\/edit$/);
	if (legacyRoadmapQuizEditMatch) {
		return {
			view: "editQuiz",
			quizId: Number(legacyRoadmapQuizEditMatch[1]),
			backTarget: { view: "roadmap" },
		};
	}

	const roadmapQuizDetailMatch = subPath.match(/^roadmap\/(\d+)\/phase\/(\d+)\/quiz\/(\d+)$/);
	if (roadmapQuizDetailMatch) {
		return {
			view: "quizDetail",
			quizId: Number(roadmapQuizDetailMatch[3]),
			backTarget: {
				view: "roadmap",
				roadmapId: Number(roadmapQuizDetailMatch[1]),
				phaseId: Number(roadmapQuizDetailMatch[2]),
			},
		};
	}

	const legacyRoadmapQuizDetailMatch = subPath.match(/^roadmap\/quiz\/(\d+)$/);
	if (legacyRoadmapQuizDetailMatch) {
		return {
			view: "quizDetail",
			quizId: Number(legacyRoadmapQuizDetailMatch[1]),
			backTarget: { view: "roadmap" },
		};
	}

	const quizEditMatch = subPath.match(/^quiz\/(\d+)\/edit$/);
	if (quizEditMatch) {
		return { view: "editQuiz", quizId: Number(quizEditMatch[1]), backTarget: null };
	}

	const quizDetailMatch = subPath.match(/^quiz\/(\d+)$/);
	if (quizDetailMatch) {
		return { view: "quizDetail", quizId: Number(quizDetailMatch[1]), backTarget: null };
	}

	return { view: null, quizId: null, backTarget: null };
}

export function buildWorkspacePathForView(view, selectedQuiz, quizBackTarget) {
	if (view === "quizDetail" && selectedQuiz?.quizId) {
		if (quizBackTarget?.view === "roadmap") {
			const normalizedRoadmapId = Number(quizBackTarget?.roadmapId);
			const normalizedPhaseId = Number(quizBackTarget?.phaseId);
			if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0 && Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0) {
				return `roadmap/${normalizedRoadmapId}/phase/${normalizedPhaseId}/quiz/${selectedQuiz.quizId}`;
			}
			return `roadmap/quiz/${selectedQuiz.quizId}`;
		}
		return `quiz/${selectedQuiz.quizId}`;
	}

	if (view === "editQuiz" && selectedQuiz?.quizId) {
		if (quizBackTarget?.view === "roadmap") {
			const normalizedRoadmapId = Number(quizBackTarget?.roadmapId);
			const normalizedPhaseId = Number(quizBackTarget?.phaseId);
			if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0 && Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0) {
				return `roadmap/${normalizedRoadmapId}/phase/${normalizedPhaseId}/quiz/${selectedQuiz.quizId}/edit`;
			}
			return `roadmap/quiz/${selectedQuiz.quizId}/edit`;
		}
		return `quiz/${selectedQuiz.quizId}/edit`;
	}

	return VIEW_TO_PATH[view] || null;
}
