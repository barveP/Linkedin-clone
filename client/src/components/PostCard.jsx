import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useLazyQuery } from '@apollo/client';
import { LIKE_POST, UNLIKE_POST, COMMENT_ON_POST, POST_DETAIL } from '../graphql/operations';
import Avatar from './Avatar';
import { timeAgo } from '../utils/time';
import { trackEvent } from '../analytics/ga';

export default function PostCard({ post }) {
  const [likedByMe, setLikedByMe] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Keep local display state in sync if the post prop changes (e.g. the same
  // post re-fetched, or updated via the Apollo cache from another view).
  useEffect(() => {
    setLikedByMe(post.likedByMe);
    setLikeCount(post.likeCount);
    setCommentCount(post.commentCount);
  }, [post.id, post.likedByMe, post.likeCount, post.commentCount]);

  const [likePost, { loading: liking }] = useMutation(LIKE_POST);
  const [unlikePost, { loading: unliking }] = useMutation(UNLIKE_POST);
  const [commentOnPost, { loading: commenting, error: commentError }] =
    useMutation(COMMENT_ON_POST);

  // Existing comments are not part of the feed payload — lazily load them the
  // first time the comment section is opened, de-duping against session adds.
  const [loadComments] = useLazyQuery(POST_DETAIL, {
    variables: { id: post.id },
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      const fetched = data?.post?.comments || [];
      setComments((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        return [...fetched.filter((c) => !ids.has(c.id)), ...prev];
      });
      setCommentsLoaded(true);
    },
  });

  function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded) loadComments();
  }

  async function toggleLike() {
    try {
      if (likedByMe) {
        const { data } = await unlikePost({ variables: { postId: post.id } });
        setLikedByMe(data.unlikePost.likedByMe);
        setLikeCount(data.unlikePost.likeCount);
      } else {
        const { data } = await likePost({ variables: { postId: post.id } });
        setLikedByMe(data.likePost.likedByMe);
        setLikeCount(data.likePost.likeCount);
        trackEvent('like_post');
      }
    } catch {
      /* swallow — UI stays in its prior state */
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || commenting) return;
    try {
      const { data } = await commentOnPost({
        variables: { postId: post.id, content: trimmed },
      });
      setComments((prev) => [...prev, data.commentOnPost]);
      setCommentCount((c) => c + 1);
      setCommentText('');
    } catch {
      /* error surfaced via commentError below */
    }
  }

  return (
    <article className="card">
      <div className="card-body">
        <header className="post-header">
          <Avatar user={post.author} size="md" />
          <div className="stack">
            <Link className="post-author" to={`/profile/${post.author.id}`}>
              {post.author.name}
            </Link>
            {post.author.headline && (
              <span className="post-meta">{post.author.headline}</span>
            )}
            <span className="post-meta">{timeAgo(post.createdAt)}</span>
          </div>
        </header>

        <p className="post-content">{post.content}</p>
        {post.imageUrl && (
          <img className="post-image" src={post.imageUrl} alt="" />
        )}

        <div className="post-stats row between">
          <span>{likeCount} likes</span>
          <span>{commentCount} comments</span>
        </div>

        <div className="post-actions row">
          <button
            type="button"
            className={`btn btn-ghost${likedByMe ? ' liked' : ''}`}
            onClick={toggleLike}
            disabled={liking || unliking}
            aria-pressed={likedByMe}
          >
            Like
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={toggleComments}
            aria-expanded={showComments}
          >
            Comment
          </button>
        </div>

        {showComments && (
          <section className="card-section stack">
            <form className="row" onSubmit={submitComment}>
              <input
                className="input"
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                aria-label="Add a comment"
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!commentText.trim() || commenting}
              >
                Comment
              </button>
            </form>
            {commentError && (
              <div className="error-text">Could not add comment.</div>
            )}
            {comments.map((c) => (
              <div className="comment row" key={c.id}>
                <Avatar user={c.author} size="sm" />
                <div className="comment-bubble">
                  <span className="comment-author">{c.author.name}</span>
                  <p>{c.content}</p>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </article>
  );
}
