import { useEffect, useRef, useState } from 'react';
import { imgurl, callApi, apibaseurl } from './lib';
import './App.css';
import ProgressBar from './components/ProgressBar.jsx';

const App = () => {
    const [isSignin, setIsSignIn] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [mockFilter, setMockFilter] = useState('all');
    const finput = useRef();
    const [isProgress, setIsProgress] = useState(false);
    const [errorData, setErrorData] = useState({});

    const [signupData, setSignupData] = useState({
        fullname: "",
        phone: "",
        email: "",
        password: "",
        retypepassword: "",
        skills: ""
    });

    const [signinData, setSigninData] = useState({
        username: "",
        password: ""
    });

    useEffect(()=>{
        setTimeout(() => {finput.current?.focus();}, 0);
    }, [isSignin]);

    function switchWindow(){
        setIsSignIn(prev => !prev);
        setErrorData({});
        setSigninData({
            username: "",
            password: ""
        });

        setSignupData({
            fullname: "",
            phone: "",
            email: "",
            password: "",
            retypepassword: "",
            skills: ""
        });
    }

    function handleSigninInput(e){
        const {name, value} = e.target;
        setSigninData({...signinData, [name]: value});
    }

    function handleSignupInput(e){
        const {name, value} = e.target;
        setSignupData({...signupData, [name]: value});
    }

    function validateSignup(){
        let errors = {};
        if(signupData.fullname === "") errors.fullname = true;
        if(signupData.phone === "") errors.phone = true;
        if(signupData.email === "") errors.email = true;
        if(signupData.password === "") errors.password = true;
        if(signupData.retypepassword === "" || signupData.password !== signupData.retypepassword) errors.retypepassword = true;
        if(signupData.skills === "") errors.skills = true;
        setErrorData(errors);
        return Object.keys(errors).length > 0;
    }

    function validateSignin(){
        let errors = {};
        if(signinData.username === "") errors.username = true;
        if(signinData.password === "") errors.password = true;
        setErrorData(errors);
        return Object.keys(errors).length > 0;
    }

    function signin(){
        /*Connect backend using callApi() function from lib.js
        Refer lib.js for callApi() parameters*/
        if(validateSignin())
            return;

        setIsProgress(true);
        callApi("POST", apibaseurl + "/authservice/signin", signinData, null, signinResponseHandler);
    }

    function signup(){
        /*Connect backend using callApi() function from lib.js
        Refer lib.js for callApi() parameters*/
        if(validateSignup())
            return;

        setIsProgress(true);
        callApi("POST", apibaseurl + "/authservice/signup", signupData, null, signupResponseHandler);
    }

    function signinResponseHandler(res){
        if(res.code != 200)
            alert(res.message);
        else{
            localStorage.setItem("token", res.jwt);     
            window.location.replace("/home");
        }  
        setIsProgress(false);
    }

    function signupResponseHandler(res){
        alert(res.message);
        setIsProgress(false);
        setSignupData({
            fullname: "",
            phone: "",
            email: "",
            password: "",
            retypepassword: "",
            skills: ""
        });
        finput.current?.focus();
    }

    const hasToken = !!localStorage.getItem("token");

    const mockTasks = [
        { id: 1, title: "Implement OAuth2 Authentication", priority: "high", status: "progress", progress: 60, assignee: "Alex" },
        { id: 2, title: "Design Brand Identity Guidelines", priority: "normal", status: "completed", progress: 100, assignee: "Emma" },
        { id: 3, title: "Optimize database query performance", priority: "high", status: "assigned", progress: 0, assignee: "Sophia" },
        { id: 4, title: "Configure CI/CD deployment pipelines", priority: "high", status: "progress", progress: 30, assignee: "Liam" },
        { id: 5, title: "Write system integration test suite", priority: "normal", status: "completed", progress: 100, assignee: "John" }
    ];

    const filteredMockTasks = mockTasks.filter(task => {
        if (mockFilter === 'all') return true;
        return task.status === mockFilter;
    });

    const mockStats = {
        total: mockTasks.length,
        assigned: mockTasks.filter(t => t.status === 'assigned').length,
        progress: mockTasks.filter(t => t.status === 'progress').length,
        completed: mockTasks.filter(t => t.status === 'completed').length,
    };

    return (
        <div className='landing-page'>
            {/* Background Glowing Orbs */}
            <div className='glow-orb orb-1'></div>
            <div className='glow-orb orb-2'></div>

            {/* Navigation Bar */}
            <nav className='landing-header'>
                <div className='brand-logo'>
                    <span>Team</span>Flow
                </div>
                <div className='landing-nav-links'>
                    <a href='#about'>About Dashboard</a>
                    <a href='#features'>Key Features</a>
                    <a href='#demo'>Interactive Stats</a>
                </div>
                <div className='landing-auth-actions'>
                    {hasToken ? (
                        <button className='btn-workspace' onClick={() => window.location.replace('/home')}>Go to Workspace</button>
                    ) : (
                        <>
                            <button className='btn-signin' onClick={() => { setIsSignIn(true); setShowAuthModal(true); }}>Sign In</button>
                            <button className='btn-signup' onClick={() => { setIsSignIn(false); setShowAuthModal(true); }}>Sign Up</button>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <header className='landing-hero'>
                <div className='hero-badge'>Next-Gen Project Management</div>
                <h1>Unleash Your Team's True Velocity</h1>
                <p>Plan, track, and manage all your team projects in real-time. Experience the glassmorphic design and intuitive workflows built for modern high-performance teams.</p>
                <div className='hero-ctas'>
                    {hasToken ? (
                        <button className='btn-primary' onClick={() => window.location.replace('/home')}>Launch Workspace</button>
                    ) : (
                        <>
                            <button className='btn-primary' onClick={() => { setIsSignIn(false); setShowAuthModal(true); }}>Get Started Free</button>
                            <button className='btn-secondary' onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>Learn More</button>
                        </>
                    )}
                </div>
            </header>

            {/* About the Dashboard section */}
            <section id='about' className='landing-about-section'>
                <div className='section-header'>
                    <span className='section-label'>DASHBOARD CORE</span>
                    <h2>How the Workspace Dashboard Operates</h2>
                    <p>TeamFlow provides a high-fidelity control center that translates task states into real-time metrics, giving you complete visibility into team execution.</p>
                </div>
                <div className='about-grid'>
                    <div className='about-feature-box'>
                        <h4>Real-Time Progress Tracking</h4>
                        <p>Our dashboard aggregates active tasks from your database and calculates progress dynamically. It updates in real-time, giving managers a single source of truth for all current work items.</p>
                    </div>
                    <div className='about-feature-box'>
                        <h4>Multi-Role Telemetry</h4>
                        <p>TeamFlow adapts to your role automatically. Regular team members see their focused assigned tasks, while managers and admins gain access to team-wide metrics, completion ratios, and performance bars.</p>
                    </div>
                    <div className='about-feature-box'>
                        <h4>Actionable Visual Filters</h4>
                        <p>No more digging through lists. By clicking any summary metric widget (like In-Progress or Assigned), your task board filters down instantly to show exactly what demands attention.</p>
                    </div>
                </div>
            </section>

            {/* Interactive Mock Dashboard Showcase */}
            <section id='demo' className='landing-dashboard-section'>
                <div className='section-header'>
                    <span className='section-label'>LIVE TELEMETRY</span>
                    <h2>Interactive Control Center</h2>
                    <p>Click on any status card below to filter the live task tracker and preview real-time telemetry updates.</p>
                </div>

                {/* Stats Grid */}
                <div className='landing-stats-grid'>
                    <div className={`mock-stat-card total ${mockFilter === 'all' ? 'active' : ''}`} onClick={() => setMockFilter('all')}>
                        <div className='stat-info'>
                            <span className='stat-label'>Total Tasks</span>
                            <span className='stat-value'>{mockStats.total}</span>
                        </div>
                        <div className='color-indicator total'></div>
                    </div>
                    <div className={`mock-stat-card assigned ${mockFilter === 'assigned' ? 'active' : ''}`} onClick={() => setMockFilter('assigned')}>
                        <div className='stat-info'>
                            <span className='stat-label'>Assigned</span>
                            <span className='stat-value'>{mockStats.assigned}</span>
                        </div>
                        <div className='color-indicator assigned'></div>
                    </div>
                    <div className={`mock-stat-card progress ${mockFilter === 'progress' ? 'active' : ''}`} onClick={() => setMockFilter('progress')}>
                        <div className='stat-info'>
                            <span className='stat-label'>In Progress</span>
                            <span className='stat-value'>{mockStats.progress}</span>
                        </div>
                        <div className='color-indicator in-progress'></div>
                    </div>
                    <div className={`mock-stat-card done ${mockFilter === 'completed' ? 'active' : ''}`} onClick={() => setMockFilter('completed')}>
                        <div className='stat-info'>
                            <span className='stat-label'>Completed</span>
                            <span className='stat-value'>{mockStats.completed}</span>
                        </div>
                        <div className='color-indicator completed'></div>
                    </div>
                </div>

                {/* Task Board */}
                <div className='landing-task-board'>
                    <div className='board-header'>
                        <h3>Project Active Sprint</h3>
                        <span className='board-badge'>Interactive Showcase</span>
                    </div>
                    <div className='board-body'>
                        <table className='landing-table'>
                            <thead>
                                <tr>
                                    <th>Task Title</th>
                                    <th>Priority</th>
                                    <th>Progress</th>
                                    <th>Assignee</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMockTasks.map(task => (
                                    <tr key={task.id}>
                                        <td className='task-title-cell'>{task.title}</td>
                                        <td className={`priority-${task.priority}`}>
                                            <span className='priority-badge'>{task.priority}</span>
                                        </td>
                                        <td>
                                            <div className='progress-cell'>
                                                <span className='progress-val'>{task.progress}%</span>
                                                <div className='progress-bar-container'>
                                                    <div className='progress-bar-fill' style={{ width: `${task.progress}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className='assignee-cell'>
                                                <div className='avatar-wrapper'>
                                                    <span>{task.assignee.charAt(0)}</span>
                                                </div>
                                                <span>{task.assignee}</span>
                                            </div>
                                        </td>
                                        <td className={`status-${task.status}`}>
                                            <span className='status-badge'>{task.status === 'progress' ? 'In-Progress' : task.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id='features' className='landing-features'>
                <div className='section-header'>
                    <span className='section-label'>PRODUCTIVITY REDEFINED</span>
                    <h2>Built for High-Performance Teams</h2>
                </div>
                <div className='features-grid'>
                    <div className='feature-card'>
                        <div className='feature-icon'>🎯</div>
                        <h3>Smart Workflows</h3>
                        <p>Assign tasks, set priorities, and track milestones with zero complexity. Keep your sprints moving forward.</p>
                    </div>
                    <div className='feature-card'>
                        <div className='feature-icon'>📊</div>
                        <h3>Deep Analytics</h3>
                        <p>Visualize progress with dynamic graphs. Understand your velocity and performance bottlenecks instantly.</p>
                    </div>
                    <div className='feature-card'>
                        <div className='feature-icon'>🛡️</div>
                        <h3>Role Management</h3>
                        <p>Configure fine-grained roles. Managers can assign tasks, team members can update statuses, and admins oversee all operations.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className='landing-footer'>
                <div className='footer-content'>
                    <div className='brand-logo'><span>Team</span>Flow</div>
                    <p>Empowering teams worldwide to collaborate and deliver software faster.</p>
                    <div className='footer-bottom'>
                        <span>Copyright @ 2026. All rights reserved.</span>
                    </div>
                </div>
            </footer>

            {/* Authentication Modal Overlay */}
            {showAuthModal && (
                <div className='auth-modal-backdrop' onClick={() => setShowAuthModal(false)}>
                    <div className='app' onClick={(e) => e.stopPropagation()}>
                        <div className='container' key={isSignin ? "signin" : "signup"}>
                            <button className='modal-close-btn' onClick={() => setShowAuthModal(false)} aria-label="Close modal">×</button>
                            <div className='container-header'>
                                <div className='brand-logo'>
                                    <span>Team</span>Flow
                                </div>
                                <label>{isSignin ? "Sign In": "Sign Up"}</label>
                            </div>
                            <div className='container-content'>
                                {isSignin? 
                                    <>
                                    <label>Username*</label>
                                    <div className='input-group'>
                                        <img src={imgurl + "user.png"} />
                                        <input type='text' ref={finput} className={errorData.username ? 'error' : ''} placeholder='Enter email id' autoComplete='off' name="username" value={signinData.username} onChange={(e)=>handleSigninInput(e)} />
                                    </div>
                                    <label>Password*</label>
                                    <div className='input-group'>
                                        <img src={imgurl + "padlock.png"} />
                                        <input type='password' className={errorData.password ? 'error' : ''} placeholder='Enter password' name='password' value={signinData.password} onChange={(e)=>handleSigninInput(e)} />
                                    </div>
                                    <p>Forgot <span>Password?</span></p>
                                    <button onClick={()=>signin()}>Let's start</button>
                                    <label onClick={()=>switchWindow()}>Don't have an account? <span>Sign up</span></label>
                                    </>
                                :
                                    <>
                                    <label>Full Name*</label>
                                    <div className='input-group'>
                                        <img src={imgurl + "user.png"} />
                                        <input type='text' ref={finput} className={errorData.fullname ? 'error' : ''}  placeholder='Enter full name' autoComplete='off' name='fullname' value={signupData.fullname} onChange={(e)=>handleSignupInput(e)} />
                                    </div>
                                    <label>Mobile Number*</label>
                                    <div className='input-group'>
                                        <img src={imgurl + "phone.png"} />
                                        <input type='text' className={errorData.phone ? 'error' : ''} placeholder='Enter mobile number' autoComplete='off' name='phone' value={signupData.phone} onChange={(e)=>handleSignupInput(e)} />
                                    </div>
                                    <label>Email Address*</label>
                                    <div className='input-group'>
                                        <img src={imgurl + "email.png"} />
                                        <input type='text' className={errorData.email ? 'error' : ''} placeholder='Enter email id' autoComplete='off' name='email' value={signupData.email} onChange={(e)=>handleSignupInput(e)} />
                                    </div>
                                    <label>Password*</label>
                                    <div className='input-group'>
                                        <img src={imgurl + "padlock.png"} />
                                        <input type='password' className={errorData.password ? 'error' : ''} placeholder='Enter password' autoComplete='off' name='password' value={signupData.password} onChange={(e)=>handleSignupInput(e)} />
                                    </div>
                                    <label>Re-type Password*</label>
                                    <div className='input-group'>
                                        <img src={imgurl + "padlock.png"} />
                                        <input type='password' className={errorData.retypepassword ? 'error' : ''} placeholder='Re-type your password' autoComplete='off' name='retypepassword' value={signupData.retypepassword} onChange={(e)=>handleSignupInput(e)} />
                                    </div>
                                    <label>Skills*</label>
                                    <div className='input-group'>
                                        <img src={imgurl + "user.png"} />
                                        <input type='text' className={errorData.skills ? 'error' : ''} placeholder='Enter skills (e.g. React, Spring, SQL)' autoComplete='off' name='skills' value={signupData.skills} onChange={(e)=>handleSignupInput(e)} />
                                    </div>
                                    <button onClick={()=>signup()}>Register</button>
                                    <label onClick={()=>switchWindow()}>Already have an account? <span>Sign in</span></label>
                                    </>
                                }
                            </div>
                            <div className='container-footer'>Copyright @ 2026. All rights reserved.</div>
                        </div>
                    </div>
                </div>
            )}

            <ProgressBar isProgress={isProgress}/>
        </div>
    );
}

export default App;
