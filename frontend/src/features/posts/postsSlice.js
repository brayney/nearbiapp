import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postsApi } from '../../api/resources';

export const fetchFeed = createAsyncThunk(
  'posts/fetchFeed',
  async ({ page = 1, scope = 'recent' } = {}, { rejectWithValue }) => {
    try {
      const { data } = await postsApi.getFeed({ page, scope });
      return { posts: data.posts, page };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load feed');
    }
  }
);

export const toggleLike = createAsyncThunk('posts/toggleLike', async (postId) => {
  const { data } = await postsApi.toggleLike(postId);
  return { postId, liked: data.liked, likesCount: data.likesCount };
});

export const toggleSave = createAsyncThunk('posts/toggleSave', async (postId, { rejectWithValue }) => {
  try {
    const { data } = await postsApi.toggleSave(postId);
    return { postId, saved: data.saved };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Could not update saved posts.');
  }
});

export const addComment = createAsyncThunk('posts/addComment', async ({ postId, text }) => {
  const { data } = await postsApi.addComment(postId, text);
  return { postId, comment: data.comment };
});

const postsSlice = createSlice({
  name: 'posts',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    page: 1,
    hasMore: true,
  },
  reducers: {
    resetFeed(state) {
      state.items = [];
      state.page = 1;
      state.hasMore = true;
    },
    postCreated(state, action) {
      state.items.unshift(action.payload);
    },
    removePost(state, action) {
      state.items = state.items.filter((post) => post._id !== action.payload);
    },
    restorePost(state, action) {
      if (!state.items.some((post) => post._id === action.payload._id)) state.items.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.hasMore = action.payload.posts.length > 0;
        state.page = action.payload.page;
        if (action.payload.page === 1) {
          state.items = action.payload.posts;
        } else {
          const existingIds = new Set(state.items.map((p) => p._id));
          state.items.push(...action.payload.posts.filter((p) => !existingIds.has(p._id)));
        }
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        const post = state.items.find((p) => p._id === action.payload.postId);
        if (post) {
          post.likesCount = action.payload.likesCount;
          post._liked = action.payload.liked;
        }
      })
      .addCase(toggleSave.fulfilled, (state, action) => {
        const post = state.items.find((p) => p._id === action.payload.postId);
        if (post) post._saved = action.payload.saved;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const post = state.items.find((p) => p._id === action.payload.postId);
        if (post) {
          post.comments = post.comments || [];
          post.comments.push(action.payload.comment);
        }
      });
  },
});

export const { resetFeed, postCreated, removePost, restorePost } = postsSlice.actions;
export default postsSlice.reducer;
