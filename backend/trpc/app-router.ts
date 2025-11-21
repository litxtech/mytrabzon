import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { requestAccountDeletionProcedure } from "./routes/user/request-deletion/route";
import { cancelAccountDeletionProcedure } from "./routes/user/cancel-deletion/route";
import { getAllUsersProcedure } from "./routes/user/get-all-users/route";
import { updateDirectoryVisibilityProcedure } from "./routes/user/update-directory-visibility/route";
import { getRoomsProcedure } from "./routes/chat/get-rooms/route";
import { getMessagesProcedure } from "./routes/chat/get-messages/route";
import { sendMessageProcedure } from "./routes/chat/send-message/route";
import { createRoomProcedure } from "./routes/chat/create-room/route";
import { markAsReadProcedure as markChatAsReadProcedure } from "./routes/chat/mark-as-read/route";
import { deleteMessageProcedure } from "./routes/chat/delete-message/route";
import { addReactionProcedure } from "./routes/chat/add-reaction/route";
import { blockUserProcedure, unblockUserProcedure } from "./routes/chat/block-user/route";
import { addMembersProcedure } from "./routes/chat/add-members/route";
import { removeMemberProcedure } from "./routes/chat/remove-member/route";
import { leaveRoomProcedure } from "./routes/chat/leave-room/route";
import { deleteRoomProcedure } from "./routes/chat/delete-room/route";
import { deleteAllMessagesProcedure } from "./routes/chat/delete-all-messages/route";
import { updateMessageProcedure } from "./routes/chat/update-message/route";
import { createPostProcedure } from "./routes/post/create-post/route";
import { getPostsProcedure } from "./routes/post/get-posts/route";
import { likePostProcedure } from "./routes/post/like-post/route";
import { deletePostProcedure } from "./routes/post/delete-post/route";
import { deleteCommentProcedure } from "./routes/post/delete-comment/route";
import { uploadPostMediaProcedure } from "./routes/post/upload-media/route";
import { getUploadUrlProcedure } from "./routes/post/get-upload-url/route";
import { getPostDetailProcedure } from "./routes/post/get-post-detail/route";
import { addCommentProcedure } from "./routes/post/add-comment/route";
import { getCommentsProcedure } from "./routes/post/get-comments/route";
import { toggleCommentLikeProcedure } from "./routes/post/toggle-comment-like/route";
import { sharePostProcedure } from "./routes/post/share-post/route";
import { updatePostProcedure } from "./routes/post/update-post/route";
import { getPersonalizedFeedProcedure } from "./routes/post/get-personalized-feed/route";
import { getReelsFeedProcedure } from "./routes/post/get-reels-feed/route";
import { getReelsProcedure } from "./routes/post/get-reels/route";
import { uploadReelProcedure } from "./routes/post/upload-reel/route";
import { trackPostViewProcedure } from "./routes/post/track-post-view/route";
import { trackReelViewProcedure } from "./routes/post/track-reel-view/route";
import { likeReelProcedure } from "./routes/post/like-reel/route";
import { shareReelProcedure } from "./routes/post/share-reel/route";
import { updateProfileProcedure } from "./routes/user/update-profile/route";
import { uploadAvatarProcedure } from "./routes/user/upload-avatar/route";
import { getProfileProcedure } from "./routes/user/get-profile/route";
import { followUserProcedure } from "./routes/user/follow/route";
import { unfollowUserProcedure } from "./routes/user/unfollow/route";
import { checkFollowStatusProcedure } from "./routes/user/check-follow-status/route";
import { getFollowersProcedure } from "./routes/user/get-followers/route";
import { getFollowingProcedure } from "./routes/user/get-following/route";
import { getFollowStatsProcedure } from "./routes/user/get-follow-stats/route";
import { reportUserProcedure } from "./routes/user/report-user/route";
import { getRequiredPoliciesProcedure } from "./routes/user/get-required-policies/route";
import { consentToPoliciesProcedure } from "./routes/user/consent-to-policies/route";
import { checkAdminProcedure } from "./routes/admin/check-admin/route";
import { getUsersProcedure } from "./routes/admin/get-users/route";
import { deleteUsersProcedure } from "./routes/admin/delete-users/route";
import { adminDeletePostProcedure } from "./routes/admin/delete-post/route";
import { adminDeleteCommentProcedure } from "./routes/admin/delete-comment/route";
import { banUserProcedure } from "./routes/admin/ban-user/route";
import { unbanUserProcedure } from "./routes/admin/unban-user/route";
import { giveBlueTickProcedure } from "./routes/admin/give-blue-tick/route";
import { removeBlueTickProcedure } from "./routes/admin/remove-blue-tick/route";
import {
  getPoliciesProcedure,
  getAllPoliciesProcedure,
  createPolicyProcedure,
  updatePolicyProcedure,
  deletePolicyProcedure,
} from "./routes/admin/get-policies/route";
import {
  getCompanyInfoProcedure,
  updateCompanyInfoProcedure,
} from "./routes/admin/company-info/route";
import { getStatsProcedure } from "./routes/admin/get-stats/route";
import {
  getSupportTicketsProcedure,
  updateSupportTicketProcedure,
} from "./routes/admin/support-tickets/route";
import { sendNotificationProcedure } from "./routes/admin/send-notification/route";
import { getRideListProcedure } from "./routes/admin/get-ride-list/route";
import { getRideDetailProcedure as adminGetRideDetailProcedure } from "./routes/admin/get-ride-detail/route";
import { generateRidePdfProcedure } from "./routes/admin/generate-ride-pdf/route";
import { getAllPostsProcedure } from "./routes/admin/get-all-posts/route";
import { getAllCommentsProcedure } from "./routes/admin/get-all-comments/route";
import { warnPostProcedure } from "./routes/admin/warn-post/route";
import { resolveWarningProcedure } from "./routes/admin/resolve-warning/route";
import { createKycProcedure } from "./routes/kyc/create-kyc/route";
import { getKycProcedure } from "./routes/kyc/get-kyc/route";
import {
  getKycRequestsProcedure,
  approveKycProcedure,
  rejectKycProcedure,
} from "./routes/admin/kyc-requests/route";
import { createEventProcedure } from "./routes/event/create-event/route";
import { getEventsProcedure } from "./routes/event/get-events/route";
import { deleteEventProcedure } from "./routes/event/delete-event/route";
import { updateEventProcedure } from "./routes/event/update-event/route";
import { createRideProcedure } from "./routes/ride/create-ride/route";
import { searchRidesProcedure } from "./routes/ride/search-rides/route";
import { getRideDetailProcedure } from "./routes/ride/get-ride-detail/route";
import { getDriverRidesProcedure } from "./routes/ride/get-driver-rides/route";
import { bookRideProcedure } from "./routes/ride/book-ride/route";
import { approveBookingProcedure } from "./routes/ride/approve-booking/route";
import { rejectBookingProcedure } from "./routes/ride/reject-booking/route";
import { completeRideProcedure } from "./routes/ride/complete-ride/route";
import { createReviewProcedure } from "./routes/ride/create-review/route";
import { getNotificationsProcedure, getUnreadCountProcedure } from "./routes/notification/get-notifications/route";
import {
  markAsReadProcedure as markNotificationAsReadProcedure,
  deleteNotificationProcedure,
  markAllAsReadProcedure,
  deleteAllNotificationsProcedure,
} from "./routes/notification/update-notification/route";
import { createTicketProcedure } from "./routes/support/create-ticket/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  user: createTRPCRouter({
    requestAccountDeletion: requestAccountDeletionProcedure,
    cancelAccountDeletion: cancelAccountDeletionProcedure,
    getAllUsers: getAllUsersProcedure,
    updateDirectoryVisibility: updateDirectoryVisibilityProcedure,
    updateProfile: updateProfileProcedure,
    uploadAvatar: uploadAvatarProcedure,
    getProfile: getProfileProcedure,
    follow: followUserProcedure,
    unfollow: unfollowUserProcedure,
    checkFollowStatus: checkFollowStatusProcedure,
    getFollowers: getFollowersProcedure,
    getFollowing: getFollowingProcedure,
    getFollowStats: getFollowStatsProcedure,
    reportUser: reportUserProcedure,
    getRequiredPolicies: getRequiredPoliciesProcedure,
    consentToPolicies: consentToPoliciesProcedure,
  }),
  chat: createTRPCRouter({
    getRooms: getRoomsProcedure,
    getMessages: getMessagesProcedure,
    sendMessage: sendMessageProcedure,
    createRoom: createRoomProcedure,
    markAsRead: markChatAsReadProcedure,
    deleteMessage: deleteMessageProcedure,
    deleteAllMessages: deleteAllMessagesProcedure,
    updateMessage: updateMessageProcedure,
    addReaction: addReactionProcedure,
    blockUser: blockUserProcedure,
    unblockUser: unblockUserProcedure,
    addMembers: addMembersProcedure,
    removeMember: removeMemberProcedure,
    leaveRoom: leaveRoomProcedure,
    deleteRoom: deleteRoomProcedure,
  }),
  post: createTRPCRouter({
    createPost: createPostProcedure,
    getPosts: getPostsProcedure,
    likePost: likePostProcedure,
    deletePost: deletePostProcedure,
    updatePost: updatePostProcedure,
    uploadMedia: uploadPostMediaProcedure,
    getUploadUrl: getUploadUrlProcedure,
    getPostDetail: getPostDetailProcedure,
    addComment: addCommentProcedure,
    deleteComment: deleteCommentProcedure,
    getComments: getCommentsProcedure,
    toggleCommentLike: toggleCommentLikeProcedure,
    sharePost: sharePostProcedure,
    getPersonalizedFeed: getPersonalizedFeedProcedure,
    getReelsFeed: getReelsFeedProcedure,
    getReels: getReelsProcedure,
    uploadReel: uploadReelProcedure,
    trackPostView: trackPostViewProcedure,
    trackReelView: trackReelViewProcedure,
    likeReel: likeReelProcedure,
    shareReel: shareReelProcedure,
  }),
  admin: createTRPCRouter({
    checkAdmin: checkAdminProcedure,
    getUsers: getUsersProcedure,
    getAllPosts: getAllPostsProcedure,
    getAllComments: getAllCommentsProcedure,
    banUser: banUserProcedure,
    unbanUser: unbanUserProcedure,
    giveBlueTick: giveBlueTickProcedure,
    removeBlueTick: removeBlueTickProcedure,
    getPolicies: getPoliciesProcedure,
    getAllPolicies: getAllPoliciesProcedure,
    createPolicy: createPolicyProcedure,
    updatePolicy: updatePolicyProcedure,
    deletePolicy: deletePolicyProcedure,
    getCompanyInfo: getCompanyInfoProcedure,
    updateCompanyInfo: updateCompanyInfoProcedure,
    getStats: getStatsProcedure,
    getSupportTickets: getSupportTicketsProcedure,
    updateSupportTicket: updateSupportTicketProcedure,
    getKycRequests: getKycRequestsProcedure,
    approveKyc: approveKycProcedure,
    rejectKyc: rejectKycProcedure,
    sendNotification: sendNotificationProcedure,
    getRideList: getRideListProcedure,
    getRideDetail: adminGetRideDetailProcedure,
    generateRidePdf: generateRidePdfProcedure,
    deleteUser: deleteUsersProcedure,
    deletePost: adminDeletePostProcedure,
    deleteComment: adminDeleteCommentProcedure,
    warnPost: warnPostProcedure,
    resolveWarning: resolveWarningProcedure,
  }),
  kyc: createTRPCRouter({
    create: createKycProcedure,
    get: getKycProcedure,
  }),
  event: createTRPCRouter({
    createEvent: createEventProcedure,
    getEvents: getEventsProcedure,
    updateEvent: updateEventProcedure,
    deleteEvent: deleteEventProcedure,
  }),
  notification: createTRPCRouter({
    getNotifications: getNotificationsProcedure,
    getUnreadCount: getUnreadCountProcedure,
    markAsRead: markNotificationAsReadProcedure,
    deleteNotification: deleteNotificationProcedure,
    markAllAsRead: markAllAsReadProcedure,
    deleteAllNotifications: deleteAllNotificationsProcedure,
  }),
  ride: createTRPCRouter({
    createRide: createRideProcedure,
    searchRides: searchRidesProcedure,
    getRideDetail: getRideDetailProcedure,
    getDriverRides: getDriverRidesProcedure,
    bookRide: bookRideProcedure,
    approveBooking: approveBookingProcedure,
    rejectBooking: rejectBookingProcedure,
    completeRide: completeRideProcedure,
    createReview: createReviewProcedure,
  }),
  support: createTRPCRouter({
    createTicket: createTicketProcedure,
  }),
});

export type AppRouter = typeof appRouter;
