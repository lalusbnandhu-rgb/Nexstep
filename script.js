const GEMINI_API_KEY = 'AIzaSyC7e1SDk7_u2LuDTBX-CBtieAbh3FykKDI';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const COOLDOWN_MS = 30000; // 30 second cooldown between requests
let lastRequestTime = 0;// Object to store user responses

const formData = {};// Initialize the first question on page load

// Navigation and validation functions
function goToQuestion(num) {
    document.getElementById('q1').classList.add('hidden');
    document.getElementById('q2').classList.add('hidden');
    document.getElementById('q3').classList.add('hidden');
    document.getElementById('q4').classList.add('hidden');
    document.getElementById('q5').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');

    // Show the current question
    document.getElementById('q' + num).classList.remove('hidden');

    // Update progress bar
    const progressValue = (num - 1) * 20;
    document.getElementById('progress').value = progressValue;
    document.getElementById('progressText').textContent = progressValue + '%';

    // Hide all error messages
    document.querySelectorAll('.error').forEach(e => e.classList.remove('show'));
    window.scrollTo(0, 0);
}

// Validate inputs for the current question before moving to the next
function validateAndNext(current, next) {
    let isValid = false;

    // Question 1: Education and Experience
    if (current === 1) {
        let edu = document.getElementById("education").value;
        let exp = document.querySelector('input[name="experience"]:checked');
        if (edu !== "" && exp !== null) {
            isValid = true;
            formData.education = edu;
            formData.experience = exp.value;
        }
    }

    // Question 2: Interests
    if (current === 2) {
        let interests = document.querySelectorAll(
            'input[name="interests"]:checked'
        );
        if (interests && interests.length > 0) {
            isValid = true;
            formData.interests = Array.from(interests).map((i) => i.value);
        }
    }

    // Question 3: Work Environment and Style
    if (current === 3) {
        let env = document.querySelector('input[name="environment"]:checked');
        let work = document.querySelector('input[name="workstyle"]:checked');
        if (env !== null && work !== null) {
            isValid = true;
            formData.environment = env.value;
            formData.workstyle = work.value;
        }
    }

    // Question 4: Skills
    if (current === 4) {
        let skills = document.querySelectorAll('input[name="skills"]:checked');
        if (skills.length > 0) {
            isValid = true;
            formData.skills = Array.from(skills).map((s) => s.value);
        }
    }

    // Show error if not valid, otherwise go to next question
    if (isValid) {
        document.getElementById('error-q' + current).classList.remove('show');
        goToQuestion(next);
    } else {
        document.getElementById('error-q' + current).classList.add('show');
    }
}

// Final submission and AI recommendation
async function showResults() {
    // Get priority radio
    const priority = document.querySelector('input[name="priority"]:checked');

    // If no option is selected, show error message and stop the function
    if (!priority) {
        document.getElementById('error-q5').classList.add('show');
        return;
    }

    // Store form data
    formData.priority = priority.value;
    formData.additional = document.getElementById('additional').value;

    // Cache elements
    const q5 = document.getElementById('q5');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const progress = document.getElementById('progress');
    const progressText = document.getElementById('progressText');

    // Show loading state
    q5.classList.add('hidden');
    loading.classList.remove('hidden');
    progress.value = 100;
    progressText.textContent = '100%';

    try {
        await calculateCareer();
    } catch (err) {
        console.error('AI recommendation failed:', err);
        displayError(err.message);
    }

    // Show results
    loading.classList.add('hidden');
    results.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Function to call Gemini API and get career recommendation
async function calculateCareer() {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    // Enforce cooldown between requests
    if (lastRequestTime > 0 && timeSinceLast < COOLDOWN_MS) {
        const waitSec = Math.ceil((COOLDOWN_MS - timeSinceLast) / 1000);
        throw new Error(`Please wait ${waitSec} seconds before requesting another recommendation.`);
    }
    lastRequestTime = now;

    // Define allowed career paths
    const allowedCareers = [
        "Software Engineer",
        "System Analyst",
        "Data Scientist",
        "Game Developer",
        "Technical Support Specialist",
        "Cloud Architect",
        "Machine Learning Engineer"
    ];

    // Construct prompt for Gemini API
    const prompt = `You are a tech career advisor. Based on the following user profile, recommend the single best tech career path from the ALLOWED list below.

    ALLOWED CAREER PATHS (choose ONLY from this list):
    ${allowedCareers.map((career, i) => `${i + 1}. ${career}`).join('\n    ')}

    User Profile:
    - Education Level: ${formData.education}
    - Tech Experience: ${formData.experience}
    - Interests: ${formData.interests.join(', ')}
    - Preferred Work Environment: ${formData.environment}
    - Work Style Preference: ${formData.workstyle}
    - Key Skills: ${formData.skills.join(', ')}
    - Career Priority: ${formData.priority}
    - Additional Info: ${formData.additional || 'None provided'}

    IMPORTANT: The careerTitle MUST be exactly one of the careers from the allowed list above. Do not suggest any other career.

    Respond ONLY with a valid JSON object. No markdown, no code fences, no extra text. The JSON must have this exact structure:
    {
        "careerTitle": "The career title (must match exactly from the allowed list)",
        "matchPercent": 85,
        "description": "A 2-3 sentence personalized description explaining why this career fits the user based on their specific responses.",
        "whyMatches": ["Specific reason 1 tied to their profile", "Specific reason 2 tied to their profile", "Specific reason 3 tied to their profile"],
        "nextSteps": ["Actionable step 1", "Actionable step 2", "Actionable step 3"]
    }

    The matchPercent should be between 70 and 95 based on how well the profile aligns. Make all text personalized to the user's specific answers, not generic.`;

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    // Handle API errors
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to get AI recommendation. Check your API key.');
    }

    // Parse AI response
    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;

    // Parse JSON from AI response (strip code fences if present)
    const cleanJson = aiText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(cleanJson);

    // Validate that the career is from the allowed list
    if (!allowedCareers.includes(result.careerTitle)) {
        throw new Error('AI suggested an invalid career path. Please try again.');
    }

    // Display results
    document.getElementById('matchScore').textContent = result.matchPercent + '% Match';
    document.getElementById('careerTitle').textContent = result.careerTitle;
    document.getElementById('careerDesc').textContent = result.description;
    document.getElementById('whyList').innerHTML = result.whyMatches.map(w => '<li>' + w + '</li>').join('');
    document.getElementById('stepsList').innerHTML = result.nextSteps.map(s => '<li>' + s + '</li>').join('');
}