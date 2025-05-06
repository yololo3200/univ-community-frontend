import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';

const api = axios.create({ baseURL: `${process.env.REACT_APP_API_BASE_URL}/api`,
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 👇 Home, Comment, PostDetail, AdminPage 컴포넌트 추가

function Home() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
  const limit = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await api.get(`/posts?page=${page}&limit=${limit}&search=${search}`);
        setPosts(res.data.posts);
        setTotal(res.data.total);
      } catch (err) {
        console.error('❌ Error fetching posts:', err);
      }
    };
    const fetchUser = async () => {
      try {
        const res = await api.get('/me');
        setUser(res.data);
      } catch {}
    };
    fetchUser();
    fetchPosts();
  }, [page, search]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📚 Univ Community</h1>
      <div className="mb-4 flex gap-2 flex-wrap">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="border p-2 flex-1" />
        {user?.role === 'admin' && <Link to="/admin" className="px-4 py-2 bg-red-500 text-white rounded">Admin</Link>}
        <Link to="/create" className="px-4 py-2 bg-blue-500 text-white rounded">➕ 글쓰기</Link>
        {user ? (
          <>
            <span className="px-4 py-2 bg-gray-100 rounded">{user.userId}</span>
            <button onClick={handleLogout} className="px-4 py-2 bg-yellow-500 text-white rounded">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="px-4 py-2 bg-gray-500 text-white rounded">Login</Link>
            <Link to="/signup" className="px-4 py-2 bg-green-500 text-white rounded">Signup</Link>
          </>
        )}
      </div>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post._id} className="p-4 border rounded">
            <Link to={`/posts/${post._id}`} className="text-xl font-semibold text-blue-600">{post.title}</Link>
            <p className="text-sm text-gray-600">by {post.author.nickname} ({post.author.email})</p>
          </li>
        ))}
      </ul>
      <div className="flex justify-between mt-6">
        <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="px-4 py-2 bg-gray-200 rounded">⬅ Prev</button>
        <span className="text-sm">Page {page} / {Math.ceil(total / limit)}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total} className="px-4 py-2 bg-gray-200 rounded">Next ➡</button>
      </div>
    </div>
  );
}

function Comment({ comment, postId, user }) {
  const handleDelete = async () => {
    try {
      await api.delete(`/posts/${postId}/comments/${comment._id}`);
      window.location.reload();
    } catch (err) {
      alert('삭제 실패');
    }
  };
  return (
    <li className="border p-2 rounded text-sm">
      🧑 {comment.user?.nickname || '익명'}: {comment.text}
      {(user?.userId === comment.user?._id || user?.role === 'admin') && (
        <button onClick={handleDelete} className="ml-2 text-red-500">삭제</button>
      )}
    </li>
  );
}

function PostDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/posts/${id}`).then(res => setPost(res.data));
    api.get('/me').then(res => setUser(res.data)).catch(() => {});
  }, [id]);

  const handleDeletePost = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/posts/${id}`);
      navigate('/');
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const handleComment = async () => {
    try {
      await api.post(`/posts/${id}/comments`, { text: comment });
      setComment('');
      const res = await api.get(`/posts/${id}`);
      setPost(res.data);
    } catch (err) {
      alert('Login required');
    }
  };

  if (!post) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">{post.title}</h1>
      <p className="text-sm text-gray-600 mb-2">by {post.author.nickname} ({post.author.email})</p>
      <p className="mb-4">{post.content}</p>
      {(user?.userId === post.author._id || user?.role === 'admin') && (
        <button onClick={handleDeletePost} className="mb-4 px-3 py-1 bg-red-500 text-white rounded">🗑 글 삭제</button>
      )}
      <button className="mb-4 px-3 py-1 bg-pink-200 rounded" onClick={async () => {
        await api.post(`/posts/${id}/like`);
        const res = await api.get(`/posts/${id}`);
        setPost(res.data);
      }}>
        ❤️ 좋아요 ({post.likes?.length || 0})
      </button>

      <div className="mt-4">
        <h2 className="font-bold mb-2">💬 댓글</h2>
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="댓글을 입력하세요" className="w-full border p-2 mb-2" />
        <button onClick={handleComment} className="bg-blue-500 text-white px-4 py-2 rounded">댓글 작성</button>
        <ul className="mt-4 space-y-2">
          {post.comments?.map((c, idx) => (
            <Comment key={idx} comment={c} postId={id} user={user} />
          ))}
        </ul>
      </div>

      <Link to="/" className="mt-6 inline-block text-blue-500">← 목록으로</Link>
    </div>
  );
}

function AdminPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    api.get('/admin/users').then(res => setUsers(res.data));
  }, []);

  const changeRole = async (id, role) => {
    await api.patch(`/admin/users/${id}/role`, { role });
    const res = await api.get('/admin/users');
    setUsers(res.data);
  };

  const toggleBlock = async (id) => {
    await api.patch(`/admin/users/${id}/toggle-block`);
    const res = await api.get('/admin/users');
    setUsers(res.data);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">👑 관리자 페이지</h1>
      <ul className="space-y-2">
        {users.map(u => (
          <li key={u._id} className="p-2 border rounded text-sm flex justify-between">
            <span>{u.email} ({u.nickname}) - {u.role} {u.blocked ? '(차단됨)' : ''}</span>
            <div className="space-x-2">
              <button onClick={() => changeRole(u._id, u.role === 'admin' ? 'user' : 'admin')} className="bg-yellow-400 px-2 py-1 rounded">역할변경</button>
              <button onClick={() => toggleBlock(u._id)} className="bg-red-400 px-2 py-1 rounded">{u.blocked ? '해제' : '차단'}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
export default App;