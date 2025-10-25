import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    displayTitle: '',
    description: '',
    audio: '',
    json: '',
    order: 0
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user?.role !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchLessons();
    }
  }, [session]);

  const fetchLessons = async () => {
    try {
      const res = await fetch('/api/lessons');
      const data = await res.json();
      setLessons(data);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = '/api/lessons';
      const method = editingLesson ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLesson ? { id: editingLesson._id, ...formData } : formData)
      });

      if (!res.ok) throw new Error('Failed to save lesson');

      alert(editingLesson ? 'Cập nhật thành công!' : 'Thêm bài học thành công!');
      setShowForm(false);
      setEditingLesson(null);
      resetForm();
      fetchLessons();
    } catch (error) {
      alert('Có lỗi xảy ra: ' + error.message);
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      id: lesson.id,
      title: lesson.title,
      displayTitle: lesson.displayTitle,
      description: lesson.description,
      audio: lesson.audio,
      json: lesson.json,
      order: lesson.order
    });
    setShowForm(true);
  };

  const handleDelete = async (lessonId) => {
    if (!confirm('Bạn có chắc muốn xóa bài học này?')) return;

    try {
      const res = await fetch(`/api/lessons?id=${lessonId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete lesson');

      alert('Xóa thành công!');
      fetchLessons();
    } catch (error) {
      alert('Có lỗi xảy ra: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      displayTitle: '',
      description: '',
      audio: '',
      json: '',
      order: 0
    });
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - Deutsch Shadowing</title>
      </Head>
      
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Admin Dashboard 🛠️</h1>
        
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingLesson(null);
            resetForm();
          }}
          style={{
            padding: '10px 20px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          {showForm ? 'Đóng Form' : 'Thêm Bài Học Mới'}
        </button>

        {showForm && (
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '30px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2>{editingLesson ? 'Sửa Bài Học' : 'Thêm Bài Học Mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  ID (ví dụ: bai_2)
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  required
                  disabled={!!editingLesson}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Tiêu đề (Title)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Tiêu đề hiển thị (Display Title)
                </label>
                <input
                  type="text"
                  value={formData.displayTitle}
                  onChange={(e) => setFormData({ ...formData, displayTitle: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Mô tả (Description)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Audio URL (ví dụ: /audio/bai_2.mp3)
                </label>
                <input
                  type="text"
                  value={formData.audio}
                  onChange={(e) => setFormData({ ...formData, audio: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  JSON URL (ví dụ: /text/bai_2.json)
                </label>
                <input
                  type="text"
                  value={formData.json}
                  onChange={(e) => setFormData({ ...formData, json: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Thứ tự (Order)
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                {editingLesson ? 'Cập Nhật' : 'Thêm Bài Học'}
              </button>
            </form>
          </div>
        )}

        <h2>Danh Sách Bài Học</h2>
        <div style={{ background: 'white', borderRadius: '10px', padding: '20px' }}>
          {lessons.length === 0 ? (
            <p>Chưa có bài học nào. Hãy thêm bài học đầu tiên!</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Tiêu đề</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Mô tả</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr key={lesson._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{lesson.id}</td>
                    <td style={{ padding: '10px' }}>{lesson.displayTitle}</td>
                    <td style={{ padding: '10px' }}>{lesson.description}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(lesson)}
                        style={{
                          padding: '5px 10px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          marginRight: '5px'
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(lesson._id)}
                        style={{
                          padding: '5px 10px',
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
