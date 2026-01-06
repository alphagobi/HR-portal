import React, { useState } from 'react';

const ExpandableText = ({ text, limit = 100 }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!text) return null;

    // If text is short, just render it without interaction
    if (text.length <= limit) {
        return (
            <span className="text-xs text-gray-500 whitespace-pre-wrap block border-l-2 border-gray-100 pl-2">
                {text}
            </span>
        );
    }

    const toggle = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="text-xs text-gray-500">
            <div
                onClick={isExpanded ? toggle : undefined}
                className={`whitespace-pre-wrap border-l-2 border-gray-100 pl-2 ${isExpanded ? 'cursor-pointer' : 'line-clamp-2 overflow-hidden text-ellipsis'}`}
                title={!isExpanded ? "Click 'See more' to expand" : "Click to collapse"}
            >
                {text}
            </div>
            {!isExpanded && (
                <span
                    onClick={toggle}
                    className="text-indigo-600 font-bold cursor-pointer hover:underline text-[10px] ml-2 mt-0.5 inline-block"
                >
                    See more
                </span>
            )}
        </div>
    );
};

export default ExpandableText;
