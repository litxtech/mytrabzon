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
import { markAsReadProcedure } from "./routes/chat/mark-as-read/route";
import { deleteMessageProcedure } from "./routes/chat/delete-message/route";
import { addReactionProcedure } from "./routes/chat/add-reaction/route";
import { blockUserProcedure, unblockUserProcedure } from "./routes/chat/block-user/route";
import { addMembersProcedure } from "./routes/chat/add-members/route";
import { removeMemberProcedure } from "./routes/chat/remove-member/route";
import { leaveRoomProcedure } from "./routes/chat/leave-room/route";
import { deleteRoomProcedure } from "./routes/chat/delete-room/route";
import { createPostProcedure } from "./routes/post/create-post/route";
import { getPostsProcedure } from "./routes/post/get-posts/route";
import { likePostProcedure } from "./routes/post/like-post/route";
import { deletePostProcedure } from "./routes/post/delete-post/route";
import { uploadPostMediaProcedure } from "./routes/post/upload-media/route";
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
import { checkAdminProcedure } from "./routes/admin/check-admin/route";
import { getUsersProcedure } from "./routes/admin/get-users/route";
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
import { createKycProcedure } from "./routes/kyc/create-kyc/route";
import { getKycProcedure } from "./routes/kyc/get-kyc/route";
import {
  getKycRequestsProcedure,
  approveKycProcedure,
  rejectKycProcedure,
} from "./routes/admin/kyc-requests/route";

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
  }),
  chat: createTRPCRouter({
    getRooms: getRoomsProcedure,
    getMessages: getMessagesProcedure,
    sendMessage: sendMessageProcedure,
    createRoom: createRoomProcedure,
    markAsRead: markAsReadProcedure,
    deleteMessage: deleteMessageProcedure,
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
    getPostDetail: getPostDetailProcedure,
    addComment: addCommentProcedure,
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
  }),
  kyc: createTRPCRouter({
    create: createKycProcedure,
    get: getKycProcedure,
  }),
});

export type AppRouter = typeof appRouter;
