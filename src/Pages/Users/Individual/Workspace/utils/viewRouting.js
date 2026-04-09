import { WORKSPACE_ROUTE_SEGMENTS } from "@/lib/routePaths";

const {
	roadmaps,
	phases,
	knowledges,
	quizzes,
	flashcards,
	mockTests,
	postLearnings,
} = WORKSPACE_ROUTE_SEGMENTS;

export const VIEW_TO_PATH = {
	roadmap: roadmaps,
	quiz: quizzes,
	communityQuiz: `${quizzes}/community`,
	flashcard: flashcards,
	mockTest: mockTests,
	postLearning: postLearnings,
	createQuiz: `${quizzes}/create`,
	createFlashcard: `${flashcards}/create`,
	createMockTest: `${mockTests}/create`,
	createPostLearning: `${postLearnings}/create`,
};

const PATH_TO_VIEW = Object.entries(VIEW_TO_PATH).reduce((result, [view, path]) => {
	result[path] = view;
	return result;
}, {});

export function resolveWorkspaceViewFromSubPath(subPath) {
	if (!subPath) return { view: null, quizId: null, backTarget: null };

	const roadmapPathMatch = subPath.match(
		new RegExp(
			`^${roadmaps}/(\\d+)(?:/${phases}/(\\d+)(?:/${knowledges}/(\\d+))?)?$`,
		),
	);
	if (roadmapPathMatch) {
		const parsedKnowledgeId = roadmapPathMatch[3] ? Number(roadmapPathMatch[3]) : null;
		return {
			view: "roadmap",
			quizId: null,
			backTarget: null,
			roadmapId: Number(roadmapPathMatch[1]),
			phaseId: roadmapPathMatch[2] ? Number(roadmapPathMatch[2]) : null,
			knowledgeId:
				Number.isInteger(parsedKnowledgeId) && parsedKnowledgeId > 0
					? parsedKnowledgeId
					: null,
		};
	}

	const directView = PATH_TO_VIEW[subPath];
	if (directView) {
		return { view: directView, quizId: null, backTarget: null };
	}

	const roadmapQuizEditMatch = subPath.match(
		new RegExp(`^${roadmaps}/(\\d+)/${phases}/(\\d+)(?:/${knowledges}/(\\d+))?/${quizzes}/(\\d+)/edit$`),
	);
	if (roadmapQuizEditMatch) {
		const parsedKnowledgeId = roadmapQuizEditMatch[3] ? Number(roadmapQuizEditMatch[3]) : null;
		return {
			view: "editQuiz",
			quizId: Number(roadmapQuizEditMatch[4]),
			backTarget: {
				view: "roadmap",
				roadmapId: Number(roadmapQuizEditMatch[1]),
				phaseId: Number(roadmapQuizEditMatch[2]),
				knowledgeId: Number.isInteger(parsedKnowledgeId) && parsedKnowledgeId > 0 ? parsedKnowledgeId : null,
			},
		};
	}

	const roadmapQuizEditFallbackMatch = subPath.match(
		new RegExp(`^${roadmaps}/${quizzes}/(\\d+)/edit$`),
	);
	if (roadmapQuizEditFallbackMatch) {
		return {
			view: "editQuiz",
			quizId: Number(roadmapQuizEditFallbackMatch[1]),
			backTarget: { view: "roadmap" },
		};
	}

	const roadmapQuizDetailMatch = subPath.match(
		new RegExp(`^${roadmaps}/(\\d+)/${phases}/(\\d+)(?:/${knowledges}/(\\d+))?/${quizzes}/(\\d+)$`),
	);
	if (roadmapQuizDetailMatch) {
		const parsedKnowledgeId = roadmapQuizDetailMatch[3] ? Number(roadmapQuizDetailMatch[3]) : null;
		return {
			view: "quizDetail",
			quizId: Number(roadmapQuizDetailMatch[4]),
			backTarget: {
				view: "roadmap",
				roadmapId: Number(roadmapQuizDetailMatch[1]),
				phaseId: Number(roadmapQuizDetailMatch[2]),
				knowledgeId: Number.isInteger(parsedKnowledgeId) && parsedKnowledgeId > 0 ? parsedKnowledgeId : null,
			},
		};
	}

	const roadmapQuizDetailFallbackMatch = subPath.match(
		new RegExp(`^${roadmaps}/${quizzes}/(\\d+)$`),
	);
	if (roadmapQuizDetailFallbackMatch) {
		return {
			view: "quizDetail",
			quizId: Number(roadmapQuizDetailFallbackMatch[1]),
			backTarget: { view: "roadmap" },
		};
	}

	const quizEditMatch = subPath.match(new RegExp(`^${quizzes}/(\\d+)/edit$`));
	if (quizEditMatch) {
		return { view: "editQuiz", quizId: Number(quizEditMatch[1]), backTarget: null };
	}

	const quizDetailMatch = subPath.match(new RegExp(`^${quizzes}/(\\d+)$`));
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
			const normalizedKnowledgeId = Number(
				quizBackTarget?.knowledgeId ?? selectedQuiz?.knowledgeId,
			);
			const knowledgePathSegment = Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0
				? `/${knowledges}/${normalizedKnowledgeId}`
				: "";
			if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0 && Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0) {
				return `${roadmaps}/${normalizedRoadmapId}/${phases}/${normalizedPhaseId}${knowledgePathSegment}/${quizzes}/${selectedQuiz.quizId}`;
			}
			return `${roadmaps}/${quizzes}/${selectedQuiz.quizId}`;
		}
		return `${quizzes}/${selectedQuiz.quizId}`;
	}

	if (view === "editQuiz" && selectedQuiz?.quizId) {
		if (quizBackTarget?.view === "roadmap") {
			const normalizedRoadmapId = Number(quizBackTarget?.roadmapId);
			const normalizedPhaseId = Number(quizBackTarget?.phaseId);
			const normalizedKnowledgeId = Number(
				quizBackTarget?.knowledgeId ?? selectedQuiz?.knowledgeId,
			);
			const knowledgePathSegment = Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0
				? `/${knowledges}/${normalizedKnowledgeId}`
				: "";
			if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0 && Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0) {
				return `${roadmaps}/${normalizedRoadmapId}/${phases}/${normalizedPhaseId}${knowledgePathSegment}/${quizzes}/${selectedQuiz.quizId}/edit`;
			}
			return `${roadmaps}/${quizzes}/${selectedQuiz.quizId}/edit`;
		}
		return `${quizzes}/${selectedQuiz.quizId}/edit`;
	}

	return VIEW_TO_PATH[view] || null;
}
