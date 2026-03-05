/**
 * Mapping BE error code → i18n key.
 * Đồng bộ với: com.example.quizmateai_be.exception.ErrorCode
 *
 * ⚠️ Các code trùng (1071-1078) giữa Challenge và QuizAttempt:
 *    BE cần fix, FE fallback sang message gốc từ server.
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
  1025: 'error.quizSessionNotFound',
  1026: 'error.questionNotFound',
  1027: 'error.answerNotFound',
  1028: 'error.questionTypeNotFound',
  1029: 'error.bloomNotFound',
  1030: 'error.invalidSessionParent',
  1031: 'error.invalidSessionType',
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

  // ========== CHALLENGE ==========
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
};

export default ERROR_CODES;
