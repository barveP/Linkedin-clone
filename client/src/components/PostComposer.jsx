import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_POST } from '../graphql/operations';
import { useAuth } from '../auth/AuthContext';
import Avatar from './Avatar';
import { trackEvent } from '../analytics/ga';

export default function PostComposer({ onPosted }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [createPost, { loading, error }] = useMutation(CREATE_POST);

  const trimmed = content.trim();
  const disabled = !trimmed || loading;

  async function handleSubmit(e) {
    e.preventDefault();
    if (disabled) return;
    try {
      const { data } = await createPost({ variables: { content: trimmed } });
      onPosted?.(data.createPost);
      setContent('');
      trackEvent('create_post');
    } catch {
      /* error surfaced via `error` below */
    }
  }

  return (
    <form className="card card-body" onSubmit={handleSubmit}>
      <div className="row">
        <Avatar user={user} size="sm" />
        <textarea
          className="textarea"
          placeholder={`Share an update, @${user?.name ?? 'you'}…`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-label="Share an update"
        />
      </div>
      {error && <div className="error-text">Could not post. Please try again.</div>}
      <div className="row between">
        <span className="nav-spacer" />
        <button type="submit" className="btn btn-primary" disabled={disabled}>
          {loading ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}
