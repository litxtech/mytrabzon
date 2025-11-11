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
import { createPostProcedure } from "./routes/post/create-post/route";
import { getPostsProcedure } from "./routes/post/get-posts/route";
import { likePostProcedure } from "./routes/post/like-post/route";
import { deletePostProcedure } from "./routes/post/delete-post/route";
import { uploadPostMediaProcedure } from "./routes/post/upload-media/route";
import { getPostDetailProcedure } from "./routes/post/get-post-detail/route";
import { updateProfileProcedure } from "./routes/user/update-profile/route";
import { uploadAvatarProcedure } from "./routes/user/upload-avatar/route";
import { getProfileProcedure } from "./routes/user/get-profile/route";

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
  }),
  post: createTRPCRouter({
    createPost: createPostProcedure,
    getPosts: getPostsProcedure,
    likePost: likePostProcedure,
    deletePost: deletePostProcedure,
    uploadMedia: uploadPostMediaProcedure,
    getPostDetail: getPostDetailProcedure,
  }),
});

export type AppRouter = typeof appRouter;
