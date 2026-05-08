import { mock } from './MockAdapter'
import './fakeApi/authFakeApi'
import './fakeApi/commonFakeApi'
import './fakeApi/dashboardFakeApi'
import './fakeApi/calendarFakeApi'
import './fakeApi/chatFakeApi'
import './fakeApi/fileFakeApi'
import './fakeApi/mailFakeApi'

mock.onAny().passThrough()
