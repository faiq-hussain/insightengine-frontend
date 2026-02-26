import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 60000 });

export const generateSurvey = (data) => api.post('/surveys/generate', data);
export const getSurvey = (id) => api.get(`/surveys/${id}`);
export const listSurveys = () => api.get('/surveys');
export const deleteSurvey = (id) => api.delete(`/surveys/${id}`);
export const startResponse = (surveyId, channel = 'web') => api.post(`/surveys/${surveyId}/responses/start`, { channel });
export const submitAnswer = (responseId, data) => api.post(`/responses/${responseId}/answer`, data);
export const completeResponse = (responseId) => api.patch(`/responses/${responseId}/complete`);
export const generateInsights = (surveyId) => api.post(`/surveys/${surveyId}/insights/generate`);
export const getInsights = (surveyId) => api.get(`/surveys/${surveyId}/insights`);
export const getSurveyStats = (surveyId) => api.get(`/surveys/${surveyId}/stats`);

export default api;
