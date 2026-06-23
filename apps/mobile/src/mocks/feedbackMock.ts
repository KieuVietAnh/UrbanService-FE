export interface Feedback {
  id: string;
  category: string;
  description: string;
  location: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  evidence?: string[]; // array of image URIs (optional)
  priority?: string;
  attachmentCount?: number;
  commentCount?: number;
  supportCount?: number;
}

export const mockFeedbacks: Feedback[] = [
  {
    id: '1',
    category: 'Đèn đường hỏng',
    description: 'Đèn đường trước nhà số 123 không sáng đã 2 đêm, gây ảnh hưởng đến giao thông.',
    location: 'Số 123 Đường ABC, Quận XYZ',
    status: 'pending',
    createdAt: '2026-06-20T10:30:00Z',
    updatedAt: '2026-06-20T10:30:00Z',
    evidence: [],
    priority: 'Thấp',
    attachmentCount: 0,
    commentCount: 0,
    supportCount: 0,
  },
  {
    id: '2',
    category: 'Đường hố',
    description: 'Có hố lớn ở giữa đường XYZ, gây nguy hiểm cho anzxe ៗngười đi xe máy và ô tô.',
    location: 'Giao lộ Đường XYZ và Đường DEF, Quận XYZ',
    status: 'in_progress',
    createdAt: '2026-06-19T14:15:00Z',
    updatedAt: '2026-06-19T14:15:00Z',
    evidence: [],
    priority: 'Cao',
    attachmentCount: 2,
    commentCount: 5,
    supportCount: 3,
  },
  {
    id: '3',
    category: 'Rác rác rác',
    description: 'Người dân vứt rác không đúng miejsce ở khu công viên gây ra tình trạng không vệ sinh.',
    location: 'Công viên Xuân Hòa, Đường GHI',
    status: 'completed',
    createdAt: '2026-06-18T09:00:00Z',
    updatedAt: '2026-06-18T09:00:00Z',
    evidence: [],
    priority: 'Trung bình',
    attachmentCount: 1,
    commentCount: 2,
    supportCount: 7,
  },
];