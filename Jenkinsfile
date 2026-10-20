pipeline {
    agent any

    stages {
        stage('Install dependencies') {
            steps {
                dir('server') {
                    sh 'npm ci || npm install'
                }
            }
        }

        stage('Test') {
            steps {
                dir('server') {
                    sh 'npm test'
                }
            }
        }

        stage('Package') {
            steps {
                sh 'tar --exclude=node_modules --exclude=uploads --exclude=.env -czf assetflow-server-${BUILD_NUMBER}.tgz -C server .'
            }
        }
    }

    post {
        success {
            archiveArtifacts artifacts: '*.tgz', fingerprint: true
        }
    }
}