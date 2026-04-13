/**
 * Map BE error codes to i18n keys.
 * Keep in sync with com.example.quizmateai_be.exception.ErrorCode.
 *
 * Note: codes 1071-1078 overlap between Challenge and QuizAttempt.
 * FE falls back to the original BE message for those codes.
 */
const ERROR_CODES = {
  // ========== XÁC THỰC / TÀI KHOẢN ==========
  1001: 'error.userNotExisted',
  1002: 'error.wrongPass',
  1003: 'error.userExisted',
  1004: 'error.emailUsed',
  1005: 'error.invalidToken',
  1006: 'error.unauthorized',
  1007: 'error.roleNotFound',
  1008: 'error.fieldNotFound',
  1009: 'error.topicNotFound',
  1090: 'error.topicCodeExisted',
  1091: 'error.fieldCodeExisted',

  // ========== WORKSPACE ==========
  1010: 'error.workspaceExisted',
  1014: 'error.workspaceNotFound',

  // ========== GROUP ==========
  1015: 'error.groupNotFound',
  1016: 'error.roadmapNotFound',
  1017: 'error.roadmapPhaseNotFound',
  1018: 'error.roadmapKnowledgeNotFound',
  1019: 'error.contextNotFound',
  1021: 'error.groupRoleNotFound',
  1022: 'error.notGroupLeader',
  1032: 'error.memberNotFound',
  1058: 'error.contributorSlotLimit',
  1059: 'error.memberUploadSlotLimit',

  // ========== FLASHCARD ==========
  1020: 'error.flashcardSetNotFound',
  1061: 'error.flashcardItemNotFound',
  1062: 'error.flashcardSetEmpty',

  // ========== ROADMAP ==========
  1023: 'error.generalRoadmapExists',
  1063: 'error.generalRoadmapExistsWorkspace',

  // ========== QUIZ ==========
  1024: 'error.quizNotFound',
  1025: 'error.quizSectionNotFound',
  1026: 'error.questionNotFound',
  1027: 'error.answerNotFound',
  1028: 'error.questionTypeNotFound',
  1029: 'error.bloomNotFound',
  1030: 'error.invalidSectionParent',
  1031: 'error.invalidSectionType',
  1068: 'error.quizNotInGroup',
  1083: 'error.quizNotActive',
  1084: 'error.quizUpdateLockedAfterAttempt',

  // ========== XÁC THỰC ==========
  1033: 'error.passwordNotMatch',

  // ========== THANH TOÁN & LỜI MỜI ==========
  1034: 'error.planNotFound',
  1035: 'error.planInUse',
  1036: 'error.accountNotFoundByEmail',
  1037: 'error.alreadyGroupMember',
  1038: 'error.invitationAlreadySent',
  1039: 'error.invitationNotFound',
  1040: 'error.invitationExpired',
  1041: 'error.groupMemberLimitReached',
  1042: 'error.invalidPlanSubscription',
  1043: 'error.paymentNotFound',
  1044: 'error.planNotActive',
  1045: 'error.planNameExisted',
  1046: 'error.planDisplayNameExisted',

  // ========== TRẠNG THÁI TÀI KHOẢN ==========
  1047: 'error.userInactive',

  // ========== PHÂN QUYỀN ==========
  1048: 'error.forbidden',
  1049: 'error.permissionNotFound',
  1050: 'error.invalidPermissionInput',
  1051: 'error.roleAlreadyExists',
  1052: 'error.roleInUse',
  1053: 'error.lastSuperAdminProtected',
  1054: 'error.systemRoleProtected',
  1055: 'error.conflict',
  1056: 'error.planLimitReached',
  1057: 'error.paymentNotPending',

  // ========== HẠN CHẾ QUYỀN ==========
  1060: 'error.adminCannotUseUserFeatures',

  // ========== TÀI LIỆU ==========
  1065: 'error.materialNotFound',
  1066: 'error.planFeatureNotSupported',
  1067: 'error.defaultPlanExistsForType',

  // ========== CHALLENGE (legacy) ==========
  1069: 'error.challengeNotFound',
  1070: 'error.invalidChallengeTime',
  // ⚠️ 1071-1078 trùng với QuizAttempt — FE ưu tiên message gốc từ BE
  1071: 'error.challengeTimeMustBeFuture',
  1072: 'error.challengeAlreadyJoined',
  1073: 'error.challengeNotScheduled',
  1074: 'error.challengeNotJoinable',
  1075: 'error.challengeCannotStart',
  1076: 'error.challengeAlreadyStarted',
  1077: 'error.challengeAlreadyFinished',
  1078: 'error.challengeParticipantNotFound',
  1079: 'error.challengeNotPlaying',
  1080: 'error.challengeAlreadySubmitted',

  // ========== GÓI ==========
  1081: 'error.defaultPlanCannotDelete',
  1082: 'error.defaultPlanCannotUpdateType',
  1064: 'error.defaultPlanCannotInactive',

  // ========== QUIZ ATTEMPT (lifecycle) ==========
  1085: 'error.quizAttemptNotFound',
  1086: 'error.quizAttemptLimitReached',
  1087: 'error.quizAttemptAlreadyCompleted',
  1088: 'error.quizAttemptNotInProgress',
  1092: 'error.quizAttemptTimeExpired',
  1093: 'error.answerNotBelongToQuestion',
  1095: 'error.questionAlreadyAnswered',
  1096: 'error.quizAttemptNotCompleted',
  1124: 'error.quizAttemptNotPracticeMode',
  1125: 'error.practiceNeedSubmitPerQuestion',
  1126: 'error.practiceQuestionAlreadySubmitted',
  1127: 'error.practiceNeedSelectAnswer',

  // ========== SYSTEM CONFIG / DOMAIN / KNOWLEDGE ==========
  1098: 'error.domainOrDifficultyNotFound',
  1099: 'error.knowledgeNotFound',
  1100: 'error.schemeNotFound',
  1101: 'error.schemeLevelNotFound',
  1102: 'error.domainExisted',
  1103: 'error.knowledgeExisted',
  1104: 'error.schemeExisted',
  1105: 'error.invalidSchemeLevelParent',
  1106: 'error.invalidLevelSystemType',
  1107: 'error.invalidSchemeLevelInput',
  1108: 'error.schemeLevelConflict',
  1109: 'error.domainInUse',
  1097: 'error.iwpSchemeRequired',

  // ========== PLAN (extended) ==========
  1110: 'error.planDefaultAlreadyExists',
  1111: 'error.planDefaultCannotDeactivate',
  1112: 'error.planWorkspaceActiveCannotDeactivate',
  1113: 'error.planLastActiveInLevelRange',
  1114: 'error.planDefaultCannotDelete',
  1115: 'error.planActiveCannotDelete',
  1116: 'error.planInUseCannotDelete',
  1117: 'error.creditPurchaseNotAllowed',

  // ========== CREDIT PACKAGE ==========
  1118: 'error.creditPackageNotFound',
  1119: 'error.creditPackageCodeExisted',
  1120: 'error.creditPackageNotActive',
  1121: 'error.invalidCreditPackage',
  1122: 'error.creditPackagePurchasedCannotDelete',
  1123: 'error.creditPackageLastActiveCannotDeactivate',

  // ========== CREDIT / AI MODEL ==========
  1128: 'error.templateNotFound',
  1129: 'error.aiModelNotFound',
  1130: 'error.aiModelAlreadyExists',
  1131: 'error.aiModelInactive',
  1132: 'error.aiModelInUse',
  1133: 'error.aiModelPriceVersionInvalid',
  1134: 'error.insufficientCreditBalance',
  1135: 'error.aiModelAssignmentInvalid',
  1136: 'error.currencyExchangeUnavailable',
  1137: 'error.aiOfficialPricingUnavailable',
  1139: 'error.insufficientCredit',

  // ========== FEEDBACK ==========
  1140: 'error.feedbackFormNotFound',
  1141: 'error.feedbackRequestNotFound',
  1142: 'error.feedbackAlreadySubmitted',
  1143: 'error.feedbackQuestionNotFound',
  1144: 'error.feedbackTargetNotEligible',
  1145: 'error.invalidFeedbackSubmission',

  // ========== CHALLENGE EVENT ==========
  1150: 'error.challengeNotFound',
  1151: 'error.challengeInvalidTime',
  1152: 'error.challengeTimeMustBeFuture',
  1153: 'error.challengeAlreadyRegistered',
  1154: 'error.challengeNotScheduled',
  1155: 'error.challengeNotJoinable',
  1156: 'error.challengeNotLive',
  1157: 'error.challengeAlreadyFinished',
  1158: 'error.challengeParticipantNotFound',
  1159: 'error.challengeAlreadySubmitted',
  1160: 'error.challengeLockedForEdit',
  1161: 'error.challengeCancelNotAllowed',
  1162: 'error.challengeInviteOnly',
  1163: 'error.challengeInvitationNotFound',
  1164: 'error.challengeAlreadyInvited',
  1165: 'error.challengeQuizNotSyncGradable',
  1166: 'error.challengeSourceQuizAssignedPrivately',
  1167: 'error.challengeWindowTooShort',
  1168: 'error.challengeStartTooSoon',
  1169: 'error.challengeEditWindowClosed',
  1170: 'error.challengeReviewerCannotRegister',
  1171: 'error.quizReviewContributorExists',
  1172: 'error.quizReviewContributorInvalid',
  1173: 'error.quizReviewContributorLimit',
  1174: 'error.quizReviewContributorCooldown',
  1175: 'error.quizReviewDecisionInvalid',
  1176: 'error.quizReviewOnlyAssignedMayDecide',
  1177: 'error.quizPublishBlockedReview',
  1178: 'error.quizReviewRevokeRequiresReminders',
  1179: 'error.quizReviewViewRequired',
  1180: 'error.challengeNotPublished',
  1181: 'error.challengeCreatorCannotRegister',
  1182: 'error.quizReviewBatchPrimaryRequired',
  1183: 'error.quizReviewBatchEmpty',

  // ========== USERNAME / EMAIL VALIDATION ==========
  2001: 'error.usernameInvalidFormat',
  2002: 'error.emailInvalidFormat',
};

export default ERROR_CODES;
