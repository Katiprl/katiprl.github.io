document.addEventListener('DOMContentLoaded', function () {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const errorMessage = document.getElementById('error-message');
    const loginForm = document.getElementById('login-form');
    const profilePage = document.getElementById('profile-page');


    loginButton.addEventListener('click', async function () {
        const usernameOrEmail = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const isLoggedIn = await login(usernameOrEmail, password);

        if (isLoggedIn) {
            loginForm.style.display = 'none';
            profilePage.style.display = 'block';
            await fetchUserProfile(); 
        } else {
            errorMessage.textContent = 'Invalid credentials';
        }
    });

    logoutButton.addEventListener('click', function () {
        logout();
    });

});

async function login(usernameOrEmail, password) {
    const credentials = btoa(usernameOrEmail + ':' + password);
    try {
        const response = await fetch('https://01.kood.tech/api/auth/signin', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + credentials,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const responseData = await response.text();
            localStorage.setItem('jwt', responseData);
            setCookie('jwt', responseData, 7);
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        return false;
    }
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            let tokenValue = c.substring(name.length, c.length);
            return tokenValue.replace(/"/g, "");
        }
    }
    return "";
}

function logout() {
    localStorage.removeItem('jwt');
    setCookie('jwt', '', -1); 

    window.location.href = 'https://katiprl.github.io./'; 
}





  


