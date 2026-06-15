import React, { useEffect, useState } from 'react';
import './Journal.css';
import ProgressBar from './ProgressBar';
import { apibaseurl, callApi } from '../lib';

const Journal = ({ logout }) => {
    const [isProgress, setIsProgress] = useState(false);
    const [entries, setEntries] = useState([]);
    const [token, setToken] = useState("");
    const [newNote, setNewNote] = useState("");
    const [selectedEntry, setSelectedEntry] = useState(null);

    useEffect(() => {
        const storedtoken = localStorage.getItem("token");
        if (storedtoken == undefined || storedtoken == "")
            return logout();

        setToken(storedtoken);
        loadEntries(storedtoken);
    }, []);

    function loadEntries(storedToken) {
        setIsProgress(true);
        callApi("GET", apibaseurl + "/taskservice/journal", null, null, (res) => {
            setIsProgress(false);
            if (res.code === 200) {
                setEntries(res.entries || []);
                if (res.entries && res.entries.length > 0) {
                    setSelectedEntry(res.entries[0]);
                } else {
                    setSelectedEntry(null);
                }
            } else {
                alert(res.message);
            }
        }, storedToken);
    }

    function handleSaveNote(e) {
        e.preventDefault();
        if (!newNote.trim()) return;

        setIsProgress(true);
        callApi("POST", apibaseurl + "/taskservice/journal", { content: newNote }, null, (res) => {
            setIsProgress(false);
            if (res.code === 200) {
                setNewNote("");
                loadEntries(token);
            } else {
                alert(res.message);
            }
        }, token);
    }

    function handleDeleteNote(id) {
        if (!confirm("Are you sure you want to delete this journal entry?")) return;

        setIsProgress(true);
        callApi("DELETE", apibaseurl + `/taskservice/journal/${id}`, null, null, (res) => {
            setIsProgress(false);
            if (res.code === 200) {
                loadEntries(token);
            } else {
                alert(res.message);
            }
        }, token);
    }

    const formatTimestamp = (isoString) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) + ' ' + date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return isoString;
        }
    };

    return (
        <div className='journal'>
            <div className='journal-header'>
                <label>Personal Journal</label>
            </div>

            <div className='journal-content-layout'>
                {/* Left Panel: Past Entries */}
                <div className='journal-sidebar'>
                    <div className='sidebar-header'>
                        <h3>My Entries</h3>
                    </div>
                    <div className='entries-list'>
                        {entries.length === 0 ? (
                            <p className='no-notes'>No entries yet. Write your first note on the right!</p>
                        ) : (
                            entries.map(entry => (
                                <div 
                                    key={entry._id} 
                                    className={`entry-item ${selectedEntry?._id === entry._id ? 'active' : ''}`}
                                    onClick={() => setSelectedEntry(entry)}
                                >
                                    <span className='entry-timestamp'>{formatTimestamp(entry.createdat)}</span>
                                    <p className='entry-snippet'>{entry.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Note Editor & Reader */}
                <div className='journal-editor-workspace'>
                    <div className='new-note-form-panel'>
                        <h3>Write New Note</h3>
                        <form onSubmit={handleSaveNote}>
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Write down milestones, thoughts, or sprint notes... Saved automatically with current date and time."
                                rows={6}
                                required
                            />
                            <button type="submit" className='save-note-btn'>Save Note</button>
                        </form>
                    </div>

                    {selectedEntry && (
                        <div className='selected-entry-preview-panel'>
                            <div className='preview-header'>
                                <h3>Entry details</h3>
                                <button className='delete-entry-btn' onClick={() => handleDeleteNote(selectedEntry._id)}>
                                    Delete Entry
                                </button>
                            </div>
                            <span className='preview-timestamp'>{formatTimestamp(selectedEntry.createdat)}</span>
                            <div className='preview-body-text'>
                                {selectedEntry.content}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ProgressBar isProgress={isProgress} />
        </div>
    );
};

export default Journal;
