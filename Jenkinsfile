pipeline {
    agent any

    environment {
        IMAGE_NAME = "fintrack-app"
        DOCKER_REGISTRY = "your-dockerhub-username"
        CONTAINER_PORT = "3000"
        HOST_PORT = "3000"
        CONTAINER_NAME = "fintrack_container"

        // RDS & DB credentials from Jenkins
        RDS_HOST = credentials('rds-endpoint')           // RDS endpoint
        DB_NAME = "fintrack_db"
        DB_USER = credentials('rds-db-user')             // normal DB user
        DB_PASS = credentials('rds-db-pass')             // DB user password
        ROOT_USER = credentials('rds-root-user')         // root username
        ROOT_PASSWORD = credentials('rds-root-pass')     // root password
        DATABASE_SQL = "database.sql"

        // SonarQube
        SONAR_TOKEN = credentials('sonarqube-token')
    }

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/charannk007/FinTrack.git'
            }
        }

        stage('Provision DB & User on RDS') {
            when {
                allOf {
                    branch 'main'
                    not { expression { fileExists('.provisioned') } }
                }
            }
            steps {
                sh """
                echo 'Creating database and granting privileges on RDS...'
                mysql -h $RDS_HOST -u $ROOT_USER -p$ROOT_PASSWORD <<EOF
                CREATE DATABASE IF NOT EXISTS $DB_NAME;
                CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASS';
                GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
                FLUSH PRIVILEGES;
                EOF

                touch .provisioned
                """
            }
        }

        stage('Deploy SQL to RDS') {
            when { branch 'main' }
            steps {
                sh """
                echo 'Importing schema/data into RDS...'
                mysql -h $RDS_HOST -u $DB_USER -p$DB_PASS $DB_NAME < $DATABASE_SQL
                """
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Run Tests') {
            when {
                expression { fileExists('test') }
            }
            steps {
                sh 'npm test'
            }
        }

        stage('SonarQube Analysis') {
            environment {
                SONAR_SCANNER_HOME = tool 'SonarQubeScanner'
            }
            steps {
                withSonarQubeEnv('SonarQubeServer') {
                    sh """
                    ${SONAR_SCANNER_HOME}/bin/sonar-scanner \
                    -Dsonar.login=$SONAR_TOKEN
                    """
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest ."
            }
        }

        stage('Push to DockerHub') {
            steps {
                withCredentials([
                    usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')
                ]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh "docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
                }
            }
        }
    }

    post {
        success {
            echo '✅ FinTrack pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed. Please check logs.'
        }
    }
}
