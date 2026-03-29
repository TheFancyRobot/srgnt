#!/bin/bash

# /vault:resume - Resume from the most recent or specified session
# Usage: /vault:resume [--session <session-id>]

set -e

VAULT_SESSIONS_DIR=".agent-vault/05_Sessions"

# Parse arguments
SPECIFIED_SESSION=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --session)
            SPECIFIED_SESSION="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Find session files sorted by timestamp (newest first)
find_sessions() {
    if [[ -d "$VAULT_SESSIONS_DIR" ]]; then
        find "$VAULT_SESSIONS_DIR" -name "*.md" -type f | sort -r
    fi
}

# Extract session_id from frontmatter
get_session_id() {
    local file="$1"
    grep -A 20 "^---" "$file" | grep "^session_id:" | sed 's/session_id: *//' | tr -d '"'
}

# Get the most recent session or find specified session
get_target_session() {
    if [[ -n "$SPECIFIED_SESSION" ]]; then
        # Find session by ID
        local session_file=""
        while IFS= read -r file; do
            local sid
            sid=$(get_session_id "$file")
            if [[ "$sid" == "$SPECIFIED_SESSION" ]]; then
                session_file="$file"
                break
            fi
        done < <(find_sessions)
        
        if [[ -z "$session_file" ]]; then
            echo "Error: Session '$SPECIFIED_SESSION' not found in $VAULT_SESSIONS_DIR" >&2
            exit 1
        fi
        echo "$session_file"
    else
        # Return most recent session
        local latest
        latest=$(find_sessions | head -n 1)
        if [[ -z "$latest" ]]; then
            echo "Error: No sessions found in $VAULT_SESSIONS_DIR. Use /vault:execute instead." >&2
            exit 1
        fi
        echo "$latest"
    fi
}

# Extract phase link from session frontmatter
get_phase_link() {
    local session_file="$1"
    grep -A 20 "^---" "$session_file" | grep "^phase:" | sed 's/phase: *//' | tr -d '"'
}

# Extract specific section content - simplified approach
get_section_raw() {
    local session_file="$1"
    local section_name="$2"
    sed -n "/^## $section_name/,/^## /{p;/^## /d;}" "$session_file" 2>/dev/null | head -n -1
}

# Main execution
main() {
    echo "🔍 Locating session to resume..."
    
    local session_file
    session_file=$(get_target_session)
    echo "📁 Found session: $session_file"
    
    local session_id
    session_id=$(get_session_id "$session_file")
    echo "🧾 Session ID: $session_id"
    
    # Get session details
    local phase_link
    phase_link=$(get_phase_link "$session_file")
    echo "📍 Phase: $phase_link"
    
    # Get raw sections
    local follow_up_work
    follow_up_work=$(get_section_raw "$session_file" "Follow-Up Work")
    
    local completion_summary
    completion_summary=$(get_section_raw "$session_file" "Completion Summary")
    
    # Extract execution log - lines starting with dash from Execution Log section
    local execution_log_entries
    execution_log_entries=$(awk '
        /^## Execution Log/ { in_log=1; next }
        /^## [A-Z]/ && in_log { in_log=0 }
        in_log && /^[[:space:]]*-/ { print }
    ' "$session_file")
    
    # Get last 15 execution log entries
    local recent_log
    recent_log=$(echo "$execution_log_entries" | tail -n 15)
    
    # Output summary for user confirmation
    echo ""
    echo "=== PREVIOUS SESSION HANDOFF ==="
    echo ""
    echo "Session: $session_id"
    echo "Phase: $phase_link"
    echo ""
    echo "Recent Execution Log (last 10 entries):"
    echo "$recent_log" | head -n 10
    echo ""
    echo "Follow-Up Work:"
    echo "$follow_up_work" | grep "\- \[" || echo "  (none specified)"
    echo ""
    echo "Completion Summary (last 3 lines):"
    echo "$completion_summary" | tail -n 3
    echo ""
    
    # Show availability for --session flag
    echo "Available sessions (most recent first):"
    find_sessions | head -n 5 | while read -r file; do
        local sid
        sid=$(get_session_id "$file")
        local basename
        basename=$(basename "$file")
        echo "  - $sid ($basename)"
    done
    echo ""
    echo "Use '/vault:resume --session <session-id>' to resume from a specific session."
    
    # Next step determination (for documentation)
    echo ""
    echo "=== CONTINUATION STRATEGY ==="
    echo ""
    echo "To resume work, the agent should:"
    echo "1. Read the previous session's execution log to understand what was attempted"
    echo "2. Check the step status in the linked phase"
    echo "3. Create a new session note linked to the continuation target"
    echo "4. Load focused context using vault_traverse"
    echo "5. Execute readiness checklist against the target step"
    echo "6. Continue implementation with vault:execute workflow"
}

main
