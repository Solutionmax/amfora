# How to Contribute to the Palmr. Project


Thank you for your interest in contributing to the **Palmr.** project! Contributions are what make the open-source community such an amazing place to learn, inspire, and create. This guide will walk you through the process of contributing to Palmr.

---

### Step 1: Log in to GitHub

Before you can contribute, you need to be logged into your GitHub account. If you don't have an account yet, you can sign up for free at **[GitHub](https://github.com/)**.

---

### Step 2: Go to the Palmr Repository

Once you're logged in, go to the Palmr repository by clicking on this link: **[https://github.com/kyantech/Palmr](https://github.com/kyantech/Palmr)**.

Alternatively, you can search for "Palmr" in the GitHub search bar and click on the repository owned by **kyantech**.

---

### Step 3: Fork the Repository

To contribute to the project, you’ll need to create your own copy of the repository. This is called a **fork**. Here’s how to do it:
1. Click the **Fork** button at the top right of the repository page.
2. This will create a copy of the repository under your GitHub account.

---

### Step 4: Clone Your Forked Repository

Next, you’ll need to clone your forked repository to your local machine. Here’s how:
1. On your forked repository page, click the **Code** button.
2. Copy the repository URL (HTTPS or SSH).
3. Open your terminal or command prompt and run the following command to clone the repository:

   ```bash 
   git clone <repository-url>
   ```
4. Navigate into the cloned directory:

   ```bash
   cd Palmr
   ```

---

### Step 5: Set Up the `next` Branch as the Base

Before making changes, ensure your local repository is set up to track the `next` branch from the original Palmr repository. Here’s how:
1. Add the original Palmr repository as a remote:

   ```bash
   git remote add upstream https://github.com/kyantech/Palmr.git
   ```
2. Fetch the latest changes from the `next` branch:

   ```bash
   git fetch upstream next
   ```

3. Create a new branch for your contribution based on `upstream/next`:

   ```bash
   git checkout -b your-branch-name upstream/next
   ```

---

### Step 6: Make Your Changes

Now you’re ready to make your contributions! This could include:
- Fixing a bug
- Adding a new feature
- Improving documentation
- Writing tests

Make your changes in your local repository using your preferred code editor.

---

### Step 7: Commit Your Changes Using Conventional Commits

Once you’ve made your changes, commit them to your branch using **Conventional Commits**. Conventional Commits help maintain a clean and consistent commit history. Here’s how to format your commit messages:

#### Commit Message Format:
`<type>(<scope>): <description>`

#### Examples:
- `feat: add user authentication`
- `fix(api): resolve null pointer exception`
- `docs: update README file`
- `chore: update dependencies`

#### Steps to Commit:
1. Stage your changes:

  ```bash
  git add .
  ```
2. Commit your changes with a properly formatted message:

  ```bash
  git commit -m "feat: add new feature for user profiles"
  ```

---

### Step 8: Push Your Changes to GitHub

After committing your changes, push them to your forked repository on GitHub:

```bash
git push origin your-branch-name
```

---

### Step 9: Open a Pull Request to the `next` Branch

Now that your changes are on GitHub, you can open a **Pull Request (PR)** to propose your changes to the `next` branch of the Palmr repository. Here’s how:
1. Go to your forked repository on GitHub.
2. Click the **Pull Request** button.
3. On the PR creation page:
   - Set the **base repository** to `kyantech/Palmr`.
   - Set the **base branch** to `next`.
   - Set the **head repository** to your forked repository.
   - Set the **compare branch** to your branch (`your-branch-name`).
4. Fill out the PR form with a clear title and description of your changes.
5. Click **Create Pull Request**.

---

### Step 10: Wait for Review

Once your PR is submitted, the maintainers will review your changes. They may provide feedback or request additional changes. Be sure to respond to their comments and make any necessary updates.

---

### Tips for Contributing

To ensure your contribution is accepted, follow these tips:
- **Use Conventional Commits**: Write clear and consistent commit messages using the Conventional Commits format.
- **Keep Your PRs Small**: Focus on one issue or feature per PR to make it easier to review.
- **Be Patient**: Maintainers are often volunteers and may take some time to review your PR.

---

### Why Contributing is Important

Contributing to open-source projects like Palmr has many benefits:
1. **Improves the Project**: Your contributions help make the project better for everyone.
2. **Builds Your Skills**: You’ll gain experience working with Git, GitHub, and collaborative coding.
3. **Supports the Community**: Open-source thrives on community contributions. Your work helps sustain the project.

---

### Conclusion

That's it! You've successfully contributed to the **🌴 Palmr.** project on GitHub. Thank you for your time and effort in making Palmr better for everyone. We appreciate your contribution! 
