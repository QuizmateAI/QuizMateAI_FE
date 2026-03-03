import { useState, useCallback } from 'react';
import { getTopicsWithDomains } from '@/api/TopicAPI';

const TOPIC_STORAGE_KEY = 'quizmateai.custom_topics';

const normalizeField = (field) => ({
  fieldId: Number(field?.fieldId || 0),
  title: String(field?.title || '').trim(),
  code: String(field?.code || ''),
});

const normalizeTopic = (topic) => ({
  topicId: Number(topic?.topicId || 0),
  title: String(topic?.title || '').trim(),
  code: String(topic?.code || ''),
  fields: Array.isArray(topic?.fields) ? topic.fields.map(normalizeField).filter((f) => f.title) : [],
});

const readStoredTopics = () => {
  try {
    const raw = localStorage.getItem(TOPIC_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTopic).filter((t) => t.title);
  } catch {
    return [];
  }
};

const writeStoredTopics = (topics) => {
  try {
    localStorage.setItem(TOPIC_STORAGE_KEY, JSON.stringify(topics));
  } catch {
    // Ignore storage errors silently.
  }
};

const mergeTopics = (baseTopics, overlayTopics) => {
  const topicMap = new Map();

  const upsert = (topic) => {
    const normalized = normalizeTopic(topic);
    if (!normalized.title) return;
    const key = normalized.topicId > 0
      ? `id:${normalized.topicId}`
      : `title:${normalized.title.toLowerCase()}`;

    const existing = topicMap.get(key);
    if (!existing) {
      topicMap.set(key, normalized);
      return;
    }

    const fieldMap = new Map();
    [...existing.fields, ...normalized.fields].forEach((field) => {
      const fieldKey = field.fieldId > 0
        ? `id:${field.fieldId}`
        : `title:${String(field.title || '').toLowerCase()}`;
      if (!fieldMap.has(fieldKey)) {
        fieldMap.set(fieldKey, field);
      }
    });

    topicMap.set(key, {
      ...existing,
      ...normalized,
      fields: Array.from(fieldMap.values()),
    });
  };

  (Array.isArray(baseTopics) ? baseTopics : []).forEach(upsert);
  (Array.isArray(overlayTopics) ? overlayTopics : []).forEach(upsert);

  return Array.from(topicMap.values());
};

export function useTopic() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTopicsWithDomains();
      const serverTopics = Array.isArray(res?.data) ? res.data : [];
      const storedTopics = readStoredTopics();
      setTopics(mergeTopics(serverTopics, storedTopics));
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách chủ đề');
      console.error('Lỗi khi lấy danh sách chủ đề:', err);
      const storedTopics = readStoredTopics();
      setTopics(storedTopics);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTopic = useCallback(async (title, code) => {
    const trimmed = String(title || '').trim();
    if (!trimmed) {
      throw new Error('Topic name is required');
    }

    const exists = topics.some(
      (topic) => String(topic?.title || '').trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      throw new Error('Topic already exists');
    }

    const maxTopicId = topics.reduce((maxId, topic) => {
      const id = Number(topic?.topicId || 0);
      return id > maxId ? id : maxId;
    }, 0);

    const createdTopic = {
      topicId: maxTopicId + 1,
      title: trimmed,
      code: String(code || '').trim(),
      fields: [],
    };

    const storedTopics = readStoredTopics();
    const nextStoredTopics = mergeTopics(storedTopics, [createdTopic]);
    writeStoredTopics(nextStoredTopics);

    setTopics((prev) => mergeTopics(prev, [createdTopic]));

    return createdTopic;
  }, [topics]);

  const createField = useCallback(async (topicId, title, code) => {
    const normalizedTopicId = Number(topicId);
    const trimmed = String(title || '').trim();
    if (!normalizedTopicId) {
      throw new Error('Topic is required');
    }
    if (!trimmed) {
      throw new Error('Field name is required');
    }

    const targetTopic = topics.find((topic) => Number(topic?.topicId) === normalizedTopicId);
    if (!targetTopic) {
      throw new Error('Topic not found');
    }

    const currentFields = Array.isArray(targetTopic.fields) ? targetTopic.fields : [];
    const exists = currentFields.some(
      (field) => String(field?.title || '').trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      throw new Error('Field already exists in this topic');
    }

    const maxFieldId = currentFields.reduce((maxId, field) => {
      const id = Number(field?.fieldId || 0);
      return id > maxId ? id : maxId;
    }, 0);
    const createdField = {
      fieldId: maxFieldId + 1,
      title: trimmed,
      code: String(code || '').trim(),
    };

    const storedTopics = readStoredTopics();
    const patchTopic = {
      topicId: targetTopic.topicId,
      title: targetTopic.title,
      code: targetTopic.code || '',
      fields: [createdField],
    };
    const nextStoredTopics = mergeTopics(storedTopics, [patchTopic]);
    writeStoredTopics(nextStoredTopics);

    setTopics((prev) =>
      prev.map((topic) => {
        if (Number(topic?.topicId) !== normalizedTopicId) {
          return topic;
        }
        const prevFields = Array.isArray(topic.fields) ? topic.fields : [];
        return {
          ...topic,
          fields: [...prevFields, createdField],
        };
      })
    );

    return createdField;
  }, [topics]);

  return {
    topics,
    topicsLoading: loading,
    topicsError: error,
    fetchTopics,
    createTopic,
    createField,
  };
}
