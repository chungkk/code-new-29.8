import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProtectedPage from '../../components/ProtectedPage';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'react-toastify';
import styles from '../../styles/adminDashboard.module.css';

function AdminDashboardContent() {
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    displayTitle: '',
    description: ''
  });
  const [audioFile, setAudioFile] = useState(null);
  const [srtText, setSrtText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLessons();
  }, []);

  const validateSRT = (text) => {
    if (!text.trim()) return true; // optional
    const lines = text.trim().split('\n');
    let i = 0;
    while (i < lines.length) {
      if (lines[i].trim() === '') {
        i++;
        continue;
      }
      const indexLine = lines[i].trim();
      if (!/^\d+$/.test(indexLine)) return false;
      i++;
      if (i >= lines.length) return false;
      const timeLine = lines[i].trim();
      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (!timeMatch) return false;
      i++;
      let hasText = false;
      while (i < lines.length && lines[i].trim() !== '' && !/^\d+$/.test(lines[i].trim())) {
        if (lines[i].trim()) hasText = true;
        i++;
      }
      if (!hasText) return false;
    }
    return true;
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/lessons');
      const data = await res.json();
      setLessons(data);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast.error('Không thể tải danh sách bài học');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    setUploading(true);
    let audioPath = '';
    let jsonPath = '';

    try {
      // Upload audio file (required)
      if (!audioFile) {
        throw new Error('Vui lòng chọn file audio');
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', audioFile);
      uploadFormData.append('type', 'audio');

      const audioRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: uploadFormData
      });

      if (!audioRes.ok) {
        const errorData = await audioRes.json();
        throw new Error(errorData.message || 'Upload audio failed');
      }

      const audioData = await audioRes.json();
      audioPath = audioData.url;

      // Convert SRT to JSON (required)
      if (!srtText.trim()) {
        throw new Error('Vui lòng nhập SRT text');
      }

      const token = localStorage.getItem('token');
      const srtRes = await fetch('/api/convert-srt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          srtText: srtText,
          lessonId: formData.id
        })
      });

      if (!srtRes.ok) {
        const errorData = await srtRes.json();
        throw new Error(errorData.message || 'Convert SRT failed');
      }

      const srtData = await srtRes.json();
      jsonPath = srtData.url;

      return {
        audio: audioPath,
        json: jsonPath
      };
    } catch (error) {
      throw new Error('Lỗi upload/convert: ' + error.message);
    } finally {
      setUploading(false);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    // Validate required fields
    if (!formData.id.trim()) newErrors.id = 'ID là bắt buộc';
    if (!formData.title.trim()) newErrors.title = 'Tiêu đề là bắt buộc';
    if (!formData.displayTitle.trim()) newErrors.displayTitle = 'Tiêu đề hiển thị là bắt buộc';
    if (!formData.description.trim()) newErrors.description = 'Mô tả là bắt buộc';

    // For new lessons, require both audio file and SRT text
    if (!editingLesson) {
      if (!audioFile) newErrors.audio = 'File audio là bắt buộc';
      if (!srtText.trim()) newErrors.srt = 'SRT text là bắt buộc';
    }

    // Validate SRT format if provided
    if (srtText.trim() && !validateSRT(srtText)) {
      newErrors.srt = 'Định dạng SRT không hợp lệ';
    }

    setErrors(newErrors);
    setGeneralError('');
    if (Object.keys(newErrors).length > 0) return;

    // Upload audio and convert SRT
    let finalAudioPath = '';
    let finalJsonPath = '';

    if (!editingLesson) {
      try {
        const uploadResult = await handleFileUpload();
        finalAudioPath = uploadResult.audio;
        finalJsonPath = uploadResult.json;
      } catch (error) {
        setGeneralError(error.message);
        return;
      }
    }

    // Check if lesson ID already exists (for new lessons)
    if (!editingLesson) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setGeneralError('Token không tồn tại. Vui lòng đăng nhập lại.');
          return;
        }

        const checkRes = await fetch('/api/lessons', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!checkRes.ok) {
          if (checkRes.status === 401) {
            setGeneralError('Token không hợp lệ. Vui lòng đăng nhập lại.');
            return;
          }
          throw new Error('Không thể kiểm tra ID');
        }

        const existingLessons = await checkRes.json();
        const idExists = existingLessons.some(lesson => lesson.id === formData.id);
        if (idExists) {
          setGeneralError(`ID "${formData.id}" đã tồn tại. Vui lòng chọn ID khác.`);
          return;
        }
      } catch (error) {
        console.error('Error checking existing lessons:', error);
        setGeneralError('Lỗi kiểm tra ID: ' + error.message);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setGeneralError('Token không tồn tại. Vui lòng đăng nhập lại.');
        return;
      }

      const lessonData = {
        ...formData,
        audio: finalAudioPath,
        json: finalJsonPath
      };

      console.log('Lesson data to save:', lessonData);

      const url = '/api/lessons';
      const method = editingLesson ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingLesson ? { id: editingLesson._id, ...lessonData } : lessonData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Save lesson error:', errorData);
        throw new Error(errorData.message || 'Failed to save lesson');
      }

      toast.success(editingLesson ? 'Cập nhật thành công!' : 'Thêm bài học thành công!');
      setShowForm(false);
      setEditingLesson(null);
      resetForm();
      fetchLessons();
    } catch (error) {
      toast.error('Có lỗi xảy ra: ' + error.message);
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      id: lesson.id,
      title: lesson.title,
      displayTitle: lesson.displayTitle,
      description: lesson.description
    });
    // Note: Audio and JSON paths are stored in lesson but not editable
    setShowForm(true);
  };

  const handleDelete = async (lessonId) => {
    if (!confirm('Bạn có chắc muốn xóa bài học này?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Token không tồn tại. Vui lòng đăng nhập lại.');
        return;
      }

      const res = await fetch(`/api/lessons?id=${lessonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete lesson');
      }

      toast.success('Xóa thành công!');
      fetchLessons();
    } catch (error) {
      toast.error('Có lỗi xảy ra: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      displayTitle: '',
      description: ''
    });
    setAudioFile(null);
    setSrtText('');
    setErrors({});
    setGeneralError('');
  };

  // Filter lessons based on search term
  const filteredLessons = lessons.filter(lesson => 
    lesson.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Admin Dashboard - Deutsch Shadowing</title>
      </Head>
      
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Bảng Điều Khiển Admin</h1>
            <p className={styles.subtitle}>Quản lý bài học và nội dung</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingLesson(null);
              resetForm();
            }}
            className={styles.addButton}
          >
            {showForm ? '✕ Đóng Form' : '+ Thêm Bài Học Mới'}
          </button>
        </div>

        {/* Statistics Section */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📚</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{lessons.length}</div>
              <div className={styles.statLabel}>Tổng Bài Học</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{filteredLessons.length}</div>
              <div className={styles.statLabel}>Kết Quả Tìm Kiếm</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🎯</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{showForm ? '1' : '0'}</div>
              <div className={styles.statLabel}>Đang Chỉnh Sửa</div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        {showForm && (
          <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>
              {editingLesson ? 'Sửa Bài Học' : 'Thêm Bài Học Mới'}
            </h2>

            {generalError && (
              <div className={styles.errorMessage}>
                ⚠️ {generalError}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.fullWidth}>
                <label className={styles.label}>
                  ID (ví dụ: bai_2)
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  disabled={!!editingLesson}
                  className={`${styles.input} ${errors.id ? styles.error : ''}`}
                  placeholder="Nhập ID duy nhất cho bài học"
                />
                {errors.id && <span className={styles.errorText}>{errors.id}</span>}
              </div>

              <div>
                <label className={styles.label}>
                  Tiêu đề (Title)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`${styles.input} ${errors.title ? styles.error : ''}`}
                  placeholder="Tiêu đề nội bộ"
                />
                {errors.title && <span className={styles.errorText}>{errors.title}</span>}
              </div>

              <div>
                <label className={styles.label}>
                  Tiêu đề hiển thị (Display Title)
                </label>
                <input
                  type="text"
                  value={formData.displayTitle}
                  onChange={(e) => setFormData({ ...formData, displayTitle: e.target.value })}
                  className={`${styles.input} ${errors.displayTitle ? styles.error : ''}`}
                  placeholder="Tiêu đề hiển thị cho người dùng"
                />
                {errors.displayTitle && <span className={styles.errorText}>{errors.displayTitle}</span>}
              </div>

              <div className={styles.fullWidth}>
                <label className={styles.label}>
                  Mô tả (Description)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${styles.textarea} ${errors.description ? styles.error : ''}`}
                  placeholder="Mô tả ngắn gọn về bài học"
                />
                {errors.description && <span className={styles.errorText}>{errors.description}</span>}
              </div>

              {editingLesson && (
                <div className={`${styles.fullWidth} ${styles.editWarning}`}>
                  <strong>Chế độ sửa:</strong> Bạn chỉ có thể sửa thông tin bài học. Audio và JSON không thể thay đổi.
                </div>
              )}

              {!editingLesson && (
                <>
                  <div className={styles.fullWidth}>
                    <label className={styles.label}>
                      📤 Upload Audio File *
                    </label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files[0])}
                      className={`${styles.fileInput} ${errors.audio ? styles.error : ''}`}
                    />
                    {audioFile && (
                      <p className={styles.successText}>
                        Đã chọn: {audioFile.name}
                      </p>
                    )}
                    {errors.audio && <span className={styles.errorText}>{errors.audio}</span>}
                  </div>

                  <div className={styles.fullWidth}>
                    <label className={styles.label}>
                      📝 SRT Text *
                    </label>
                    <textarea
                      value={srtText}
                      onChange={(e) => setSrtText(e.target.value)}
                      className={`${styles.textarea} ${errors.srt ? styles.error : ''}`}
                      style={{ minHeight: '200px', fontFamily: 'monospace' }}
                      placeholder={`Ví dụ:
1
00:00:03,200 --> 00:00:04,766
DW Deutsch lernen

2
00:00:05,866 --> 00:00:07,133
mit dem Top Thema`}
                    />
                    {errors.srt && <span className={styles.errorText}>{errors.srt}</span>}
                    <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                      Nhập text theo định dạng SRT (SubRip Subtitle). File JSON sẽ tự động được tạo từ text này.
                    </p>
                  </div>
                </>
              )}

              <div className={styles.fullWidth} style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  type="submit"
                  disabled={uploading}
                  className={styles.submitButton}
                >
                  {uploading ? '⏳ Đang xử lý...' : (editingLesson ? '✏️ Cập Nhật' : '➕ Thêm Bài Học')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lessons List Section */}
        <div className={styles.lessonsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Danh Sách Bài Học</h2>
            <div className={styles.lessonCount}>
              {filteredLessons.length} / {lessons.length} bài học
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
            <input
              type="text"
              placeholder="🔍 Tìm kiếm theo ID, tiêu đề hoặc mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
              style={{ maxWidth: '500px' }}
            />
          </div>

          {loading ? (
            <div className={styles.loading}>Đang tải...</div>
          ) : filteredLessons.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📚</div>
              <h3 className={styles.emptyTitle}>
                {searchTerm ? 'Không tìm thấy bài học phù hợp' : 'Chưa có bài học nào'}
              </h3>
              <p className={styles.emptyText}>
                {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Hãy thêm bài học đầu tiên của bạn!'}
              </p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tiêu đề</th>
                    <th>Mô tả</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLessons.map((lesson) => (
                    <tr key={lesson._id}>
                      <td className={styles.lessonId}>{lesson.id}</td>
                      <td className={styles.lessonDisplayTitle}>{lesson.displayTitle}</td>
                      <td className={styles.lessonDescription}>{lesson.description}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => handleEdit(lesson)}
                            className={styles.editButton}
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(lesson._id)}
                            className={styles.deleteButton}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedPage requireAdmin={true}>
      <AdminDashboardContent />
    </ProtectedPage>
  );
}
