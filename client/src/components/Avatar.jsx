import { Link } from 'react-router-dom';

const SIZES = { sm: 'avatar-sm', md: 'avatar-md', lg: 'avatar-lg' };

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

// Renders a user's avatar image, falling back to initials on a colored disc.
// When `to` is provided (or a user id exists) it links to that profile.
export default function Avatar({ user, size = 'sm', to }) {
  const cls = `avatar ${SIZES[size] || SIZES.sm}`;
  const inner = user?.avatarUrl ? (
    <img className={cls} src={user.avatarUrl} alt={user.name || 'avatar'} />
  ) : (
    <span className={cls} style={initialsStyle(size)}>{initials(user?.name)}</span>
  );

  const href = to || (user?.id ? `/profile/${user.id}` : null);
  return href ? <Link to={href} aria-label={user?.name}>{inner}</Link> : inner;
}

function initialsStyle(size) {
  const fontSize = size === 'lg' ? 32 : size === 'md' ? 18 : 15;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0a66c2',
    fontWeight: 700,
    fontSize,
  };
}
