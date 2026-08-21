import type { Course, Message, CommunityPost, PrayerRequest, EventItem, StatItem, NavItem } from '@/types';

const LOGO = 'https://vibe.filesafe.space/1782687866553072689/attachments/afd8cad3-bcd4-4d1c-8d5f-d17f211392d0.png';
const TEACHING_IMG = 'https://vibe.filesafe.space/1783647700236333185/assets/8a86b047-c436-40e4-a70b-418107cd3eae.jpg';
const COURSE_IMG = 'https://vibe.filesafe.space/1783647700236333185/assets/6710afa7-4ba0-4b94-a108-a9233da3dee4.png';
const MISSIONS_IMG = 'https://vibe.filesafe.space/1783647700236333185/assets/93824629-4731-4680-9d04-b19d36de3945.jpg';
const SCHOLARSHIP_IMG = 'https://vibe.filesafe.space/1783647700236333185/assets/1cd6ecbc-86a5-452c-8061-44834798b948.jpg';

export const IMAGES = { LOGO, TEACHING_IMG, COURSE_IMG, MISSIONS_IMG, SCHOLARSHIP_IMG };

export const navItems: NavItem[] = [
  { name: 'Home', path: '/', icon: 'Home' },
  { name: 'Watch', path: '/watch', icon: 'CirclePlay' },
  { name: 'Learn', path: '/learn', icon: 'BookOpen' },
  { name: 'Prayer', path: '/prayer', icon: 'HeartHandshake' },
  { name: 'Give', path: '/give', icon: 'Gift' },
];

export const courses: Course[] = [
  { id: 1, title: 'Foundations of Faith', instructor: 'Dr. Robert Smith', image: COURSE_IMG, progress: 65, lessons: 12, duration: '4h 30m', category: 'Theology' },
  { id: 2, title: 'Biblical Leadership', instructor: 'Pastor Sarah Jenkins', image: COURSE_IMG, progress: 0, lessons: 8, duration: '3h 15m', category: 'Leadership' },
  { id: 3, title: 'The Power of Prayer', instructor: 'Rev. Michael Chang', image: COURSE_IMG, progress: 100, lessons: 5, duration: '2h 00m', category: 'Prayer' },
];

export const recentMessages: Message[] = [
  { id: 1, title: 'Finding Peace in Chaos', series: 'Hope Restored', duration: '45m', date: 'Oct 8', image: COURSE_IMG },
  { id: 2, title: 'The Anchor of the Soul', series: 'Hope Restored', duration: '52m', date: 'Oct 1', image: COURSE_IMG },
  { id: 3, title: 'Vision Sunday', series: 'Stand Alone', duration: '1h 5m', date: 'Sep 24', image: COURSE_IMG },
];

export const featuredSeries = {
  title: 'Sunday Service: The Power of Hope',
  series: 'Hope Restored',
  date: 'Oct 15, 2023',
  duration: '1h 15m',
  image: TEACHING_IMG,
};

export const communityPosts: CommunityPost[] = [
  { id: 1, author: 'Sarah Jenkins', avatar: '', role: 'Member', time: '2 hours ago', content: "Just finished the 'Walking in the Spirit' module. The part about hearing God's voice in the quiet moments really spoke to me today. How does everyone else make space for quiet time in a busy schedule?", likes: 24, comments: 8, group: 'General Discussion' },
  { id: 2, author: 'Pastor Michael', avatar: '', role: 'Leader', time: '5 hours ago', content: "Praise Report! We just secured the building for our new community center downtown. Thank you to everyone who has been praying for this over the last 6 months. God is so faithful!", likes: 156, comments: 42, group: 'Praise & Prayer' },
  { id: 3, author: 'David Chen', avatar: '', role: 'Member', time: '1 day ago', content: "Please pray for my mother's health. She is going in for surgery tomorrow morning.", likes: 89, comments: 31, group: 'Prayer Requests' },
];

export const prayerRequests: PrayerRequest[] = [
  { id: 1, author: 'David M.', avatar: 'https://i.pravatar.cc/150?u=david', content: 'Please pray for my mother who is undergoing surgery this Thursday. Believing for complete healing and peace for our family.', prays: 124, comments: 12, time: '2 hours ago', type: 'request' },
  { id: 2, author: 'Elena R.', avatar: 'https://i.pravatar.cc/150?u=elena', content: 'Praise report! I got the job I\'ve been praying for over the last 6 months. God is so faithful!', prays: 342, comments: 45, time: '5 hours ago', type: 'praise' },
  { id: 3, author: 'Michael T.', avatar: 'https://i.pravatar.cc/150?u=michael', content: 'Praying for our upcoming mission trip to Uganda. That hearts would be open and lives transformed.', prays: 89, comments: 4, time: '1 day ago', type: 'request' },
];

export const events: EventItem[] = [
  { title: 'Worship Night', date: 'Friday, 7:00 PM', type: 'In-Person', color: 'bg-primary/10 text-primary' },
  { title: 'Leadership Masterclass', date: 'Saturday, 10:00 AM', type: 'Online', color: 'bg-secondary/10 text-secondary' },
  { title: 'Community Picnic', date: 'Sunday, 1:00 PM', type: 'In-Person', color: 'bg-primary/10 text-primary' },
];

export const impactStats: StatItem[] = [
  { label: 'Lives Changed', value: '50,000+', icon: 'HeartHandshake' },
  { label: 'Students Trained', value: '12,500', icon: 'BookOpen' },
  { label: 'Countries Reached', value: '45', icon: 'Globe' },
  { label: 'Leaders Equipped', value: '3,200', icon: 'Users' },
];

export const topics = ['Faith', 'Family', 'Purpose', 'Healing', 'Holy Spirit', 'Grace', 'Leadership', 'Prayer'];

export const designations = ['Where needed most', 'Global Missions', 'Student Scholarships', 'Building Fund'];
